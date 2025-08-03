"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useAppContext } from "../AppContext";
import styled from "styled-components";
import Instructions from "@/app/components/instructions";
import Item from "@/app/components/item";
import socket from "@/app/socket";
import { on } from "stream";

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
  myCheckedItems,
  onSessionMembersChanged,
}) => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [sessionMembers, setSessionMembers] = useState([]);
  const { appState, setAppState } = useAppContext();
  const [items, setItems] = useState([]);
  const [manualTipAmount, setManualTipAmount] = useState();
  const [socketId, setSocketId] = useState(socket.id);
  const [localStorageItems, setLocalStorageItems] = useState([]);

  const receiptData = appState.receiptData ? appState.receiptData : {};

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
    const readFromLocalStorage = () => {
      const localStorageItems = localStorage.getItem(
        `share-the-pie-session-${sessionId}`
      );
      if (localStorageItems) {
        return JSON.parse(localStorageItems).myCheckedItems;
      }
    };

    const localStorageItems = readFromLocalStorage();
    setLocalStorageItems(localStorageItems);
    if (localStorageItems) {
      socket.emit("setItemsChecked", {
        sessionId,
        itemIds: localStorageItems.map((item) => item.id),
        socketIds: localStorageItems.map((localItem) => {
          const matchingItem = items.find((item) => item.id === localItem.id);
          if (matchingItem && matchingItem.checkedBy.length > 0) {
            return [...matchingItem.checkedBy, socketId];
          } else {
            return [socketId];
          }
        }),
      });

      console.log({
        sessionId,
        itemIds: localStorageItems.map((item) => item.id),
        socketIds: localStorageItems.map((localItem) => {
          const matchingItem = items.find((item) => item.id === localItem.id);
          if (matchingItem && matchingItem.checkedBy.length > 0) {
            return [...matchingItem.checkedBy, socketId];
          } else {
            return [socketId];
          }
        }),
      });

      // const updatedItems = items.map((item) => {
      //   if (localStorageItems.includes(item.id)) {
      //     item.checkedBy = [...item.checkedBy, socketId];
      //     item.isCheckedByMe = true;

      //     // onMyCheckedItemsChange((myCheckedItems) => [...myCheckedItems, item]);

      //     return item;
      //   }
      // });

      // setItems(updatedItems);
    }
  }, [appState]);

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
      setSocketId(socket.id);
    });

    socket.on("itemsStatusChanged", (data) => {
      setItems((items) =>
        items.map((item) => {
          return item.id === data.itemId
            ? { ...item, checkedBy: data.checkedBy }
            : item;
        })
      );

      if (myCheckedItems) {
        let newMyCheckedItems = myCheckedItems.map((myCheckedItem) =>
          myCheckedItem.id === data.itemId
            ? { ...myCheckedItem, checkedBy: data.checkedBy }
            : myCheckedItem
        );
        calculateSubtotals(newMyCheckedItems, manualTipAmount);
      }
    });

    socket.on("tipAmountChanged", (data) => {
      setManualTipAmount(data.tip);
    });

    socket.on("sessionMembersChanged", (data) => {
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
    });

    return () => {
      socket.off("connect");
      socket.off("itemsStatusChanged");
      socket.off("sessionMembersChanged");
      socket.off("tipAmountChanged");
      socket.off("disconnect");
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
    const updatedItems = items.map((item) => {
      if (item.id === itemId) {
        if (item.checkedBy.length > 0) {
          if (item.checkedBy.includes(socketId)) {
            socket.emit("setItemUnchecked", {
              sessionId,
              itemId,
              socketIds: item.checkedBy,
              mySocketId: socketId,
            });
            item.isCheckedByMe = false;

            onMyCheckedItemsChange(
              myCheckedItems.filter(
                (myCheckedItem) => myCheckedItem.id !== itemId
              )
            );
            saveToLocalStorage(
              myCheckedItems.filter(
                (myCheckedItem) => myCheckedItem.id !== itemId
              )
            );
          } else {
            socket.emit("setItemChecked", {
              sessionId,
              itemId,
              socketIds: [...item.checkedBy, socketId],
            });
            item.checkedBy = [...item.checkedBy, socketId];
            item.isCheckedByMe = true;

            onMyCheckedItemsChange((myCheckedItems) => [
              ...myCheckedItems,
              item,
            ]);
            saveToLocalStorage([...myCheckedItems, item]);
          }
        } else {
          socket.emit("setItemChecked", {
            sessionId,
            itemId,
            socketIds: [...item.checkedBy, socketId],
          });
          item.checkedBy = [...item.checkedBy, socketId];
          item.isCheckedByMe = true;

          onMyCheckedItemsChange((myCheckedItems) => [...myCheckedItems, item]);
          saveToLocalStorage([...myCheckedItems, item]);
        }
        return item;
      } else {
        return item;
      }
    });

    setItems(updatedItems);
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

  useEffect(() => {
    if (myCheckedItems) {
      calculateSubtotals(myCheckedItems, manualTipAmount);
    }
  }, [myCheckedItems, calculateSubtotals, manualTipAmount]);

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
