"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useAppContext } from "../AppContext";
import styled from "styled-components";
import Instructions from "@/app/components/instructions";
import Item from "@/app/components/item";
import socket from "@/app/socket";

const Items = styled.ul`
  width: 100%;
  min-height: 50vh;
  list-style-type: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Description = styled.span``;
const Price = styled.span``;

const ItemsList = ({
  joinedFrom,
  sessionId,
  onSubtotalsChange,
  onMyCheckedItemsChange,
  onSessionMembersChanged,
  onBalancesChange,
}) => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [sessionMembers, setSessionMembers] = useState([]);
  const { appState, setAppState } = useAppContext();
  const [items, setItems] = useState([]);
  const [manualTipAmount, setManualTipAmount] = useState();
  const [socketId, setSocketId] = useState(socket.id);

  const receiptData = appState.receiptData ? appState.receiptData : {};

  // Single source of truth: the items I've checked is whatever the synced
  // `items` list says includes my socketId. No parallel copy to drift out of sync.
  const myCheckedItems = useMemo(
    () => items.filter((item) => item.checkedBy.includes(socketId)),
    [items, socketId]
  );

  const saveToLocalStorage = (items) => {
    localStorage.setItem(
      `share-the-pie-session-${sessionId}`,
      JSON.stringify({
        myCheckedItems: items.map(({ checkedBy, ...rest }) => rest),
      })
    );
  };

  useEffect(() => {
    setItems(
      appState.receiptData && appState.receiptData.items
        ? appState.receiptData.items
        : []
    );

    // Re-claim my previous selections under this connection's socket.id. The
    // server $addToSets them atomically, so just send the item ids.
    const stored = localStorage.getItem(`share-the-pie-session-${sessionId}`);
    if (stored) {
      const myStoredItems = JSON.parse(stored).myCheckedItems || [];
      if (myStoredItems.length > 0) {
        socket.emit("setItemsChecked", {
          sessionId,
          itemIds: myStoredItems.map((item) => item.id),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id);
      // Re-announce on every (re)connect so a restarted server re-learns this
      // member under the new socket id, instead of leaving them orphaned.
      if (sessionId) {
        socket.emit("newConnection", { sessionId, joinedFrom });
      }
    };

    const handleItemsStatusChanged = (data) => {
      setItems((items) =>
        items.map((item) =>
          item.id === data.itemId
            ? { ...item, checkedBy: data.checkedBy }
            : item
        )
      );
    };

    const handleTipAmountChanged = (data) => {
      setManualTipAmount(data.tip);
    };

    const handleSessionMembersChanged = (data) => {
      setSessionMembers(data.sessionMembers);
      onSessionMembersChanged(data.sessionMembers);
      if (data.memberLeft) {
        setItems((items) =>
          items.map((item) =>
            item.checkedBy.includes(data.memberLeft)
              ? {
                  ...item,
                  checkedBy: item.checkedBy.filter(
                    (socketId) => socketId !== data.memberLeft
                  ),
                }
              : item
          )
        );
      }
    };

    socket.on("connect", handleConnect);
    socket.on("itemsStatusChanged", handleItemsStatusChanged);
    socket.on("tipAmountChanged", handleTipAmountChanged);
    socket.on("sessionMembersChanged", handleSessionMembersChanged);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("itemsStatusChanged", handleItemsStatusChanged);
      socket.off("tipAmountChanged", handleTipAmountChanged);
      socket.off("sessionMembersChanged", handleSessionMembersChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSessionMembersChanged]);

  useEffect(() => {
    sessionId &&
      socket.emit("newConnection", {
        sessionId,
        joinedFrom,
      });
  }, [sessionId, joinedFrom]);

  const handleItemClick = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const checkedByMe = item.checkedBy.includes(socketId);

    // Optimistically update only my own membership in the shared array, then let
    // the server's authoritative broadcast reconcile. Everything downstream
    // (myCheckedItems, subtotals, the checkbox) derives from `items`.
    const nextItems = items.map((i) =>
      i.id === itemId
        ? {
            ...i,
            checkedBy: checkedByMe
              ? i.checkedBy.filter((id) => id !== socketId)
              : [...i.checkedBy, socketId],
          }
        : i
    );
    setItems(nextItems);
    saveToLocalStorage(nextItems.filter((i) => i.checkedBy.includes(socketId)));

    socket.emit(checkedByMe ? "setItemUnchecked" : "setItemChecked", {
      sessionId,
      itemId,
    });
  };

  const calculateSubtotals = useCallback(
    (myCheckedItems, manualTipAmount) => {
      if (receiptData && receiptData.transaction) {
        let checkedItemsPrices = [];
        myCheckedItems.map((checkedItem) => {
          checkedItemsPrices.push(
            checkedItem.price / checkedItem.checkedBy.length
          );
        });

        let myItems = checkedItemsPrices.reduce(
          (acc, current) => acc + current,
          0
        );

        let myTip =
          (myItems / receiptData.transaction.items) *
          receiptData.transaction.tip;

        if (manualTipAmount !== undefined) {
          myTip = (myItems / receiptData.transaction.items) * manualTipAmount;
        }

        let myTax =
          (myItems / receiptData.transaction.items) *
          receiptData.transaction.tax;

        onSubtotalsChange({ myItems, myTip, myTax });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [receiptData]
  );

  // The one and only recompute path. Whenever the synced items, my socket, or
  // the tip change, derive subtotals and propagate my selection upward exactly
  // once — no competing handler to flash a stale value first. (localStorage is
  // written on click, not here, so the initial empty render can't wipe it.)
  useEffect(() => {
    calculateSubtotals(myCheckedItems, manualTipAmount);
    onMyCheckedItemsChange(myCheckedItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCheckedItems, manualTipAmount, calculateSubtotals]);

  // Per-person balances for the payer's view: each connected participant owes
  // their claimed items (split by how many share each) plus a proportional cut
  // of tip and tax; the payer covers whatever's left (total minus everyone
  // else — i.e. their own picks plus anything unclaimed).
  useEffect(() => {
    if (!onBalancesChange || !receiptData || !receiptData.transaction) return;

    const subtotal = receiptData.transaction.items;
    const tax = receiptData.transaction.tax || 0;
    const tip =
      manualTipAmount !== undefined
        ? parseFloat(manualTipAmount) || 0
        : receiptData.transaction.tip || 0;
    const grandTotal = subtotal + tax + tip;

    const shareForSocketId = (socketId) => {
      let claimedItems = 0;
      items.forEach((item) => {
        if (item.checkedBy.includes(socketId)) {
          claimedItems += item.price / item.checkedBy.length;
        }
      });
      const ratio = subtotal ? claimedItems / subtotal : 0;
      return claimedItems + ratio * tip + ratio * tax;
    };

    const participants = sessionMembers
      .filter((member) => !member.isSessionCreator)
      .map((member) => ({ id: member.id, amount: shareForSocketId(member.id) }));
    const claimed = participants.reduce((acc, p) => acc + p.amount, 0);

    onBalancesChange({
      participants,
      payerAmount: grandTotal - claimed,
      grandTotal,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sessionMembers, manualTipAmount, receiptData]);

  return isConnected ? (
    <Items>
      <Instructions>{socketId}</Instructions>
      {items &&
        items.map((item, index) => {
          return (
            <Item
              key={item.id}
              item={item}
              mySocketId={socketId}
              handleClick={() => {
                handleItemClick(item.id);
              }}
            />
          );
        })}
    </Items>
  ) : (
    <Instructions>Please wait...</Instructions>
  );
};

export default ItemsList;
