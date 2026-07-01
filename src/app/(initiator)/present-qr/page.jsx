/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import Button from "@/app/components/button";
import ItemsList from "@/app/components/itemsList";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../AppContext";
import chooseServer from "@/app/utils/chooseServer";
import Container from "@/app/components/container";
import Instructions from "@/app/components/instructions";
import Card from "@/app/components/card";
import FormField from "@/app/components/formField";
import SessionMembersIndicator from "@/app/components/sessionMembersIndicator";
import BalancesBreakdown from "@/app/components/balancesBreakdown";
import Gap from "@/app/components/gap";
import { debounce } from "lodash";
import socket from "@/app/socket";
import { motion } from "@/app/theme";

const QRCode = styled.img`
  width: calc(100vw - 2rem);
  height: calc(100vw - 2rem);
  min-height: calc(100vw - 2rem);
  border-radius: ${(props) => props.theme.surfaceBorderRadius};
  overflow: hidden;
  opacity: 1;
  transform: scale(1);
  transition-property: opacity, transform;
  transition-duration: ${(props) => props.theme.motion.showQRCodeDuration}ms;
  position: relative;
  z-index: 1;

  &:not([src]) {
    // Prevents border that browser adds on images without sources
    // before QR code is generated and shown
    transform: scale(0.95);
    opacity: 0;
  }
`;

const Suggestions = styled.div`
  position: absolute;
  display: flex;
  flex-direction: row;
  right: calc(0.5rem + 2px);
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  font-size: 1rem;
  height: 100%;
`;

const Suggestion = styled.div`
  align-items: center;
  display: flex;
  color: ${(props) =>
    props.$isSelected ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.5)"};
  padding: 0.75rem;
  transition-property: opacity;
  transition-duration: ${(props) =>
    props.theme.motion.defaultTransitionDuration}ms;
  height: 100%;

  &:active {
    opacity: 0.5;
  }
`;

const FormFieldWithSuggestions = styled.div`
  position: relative;
  z-index: 1;
`;

const Prefix = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: calc(1.25rem + 2px);
  font-size: 1rem;
  line-height: 2.25rem;
`;

const FormFieldWithPrefix = styled.div`
  position: relative;

  input:placeholder-shown + ${Prefix} {
    color: rgba(255, 255, 255, 0.25);
  }
`;

const QrPage = () => {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [sessionMembers, setSessionMembers] = useState([]);
  const [qrCode, setQrCode] = useState(null);
  const [tipAmount, setTipAmount] = useState(null);
  const [isManualTipAmount, setIsManualTipAmount] = useState(false);
  const { appState, setAppState } = useAppContext();
  const server = chooseServer();

  const [isContainerReady, setIsContainerReady] = useState(false);
  const [isContainerVisible, setIsContainerVisible] = useState(false);

  useEffect(() => {
    setIsContainerReady(true);

    setTimeout(() => {
      setIsContainerVisible(true);
    }, motion.delayToShowContainer);

    const getReceiptData = async (sessionId) => {
      try {
        const response = await fetch(`${server.api}/getReceiptData`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // Format to 2 decimals so the text field keeps trailing zeros
        // (the DB stores tip as a number, e.g. 12.4, not "12.40").
        setTipAmount(
          data.transaction.tip != null
            ? Number(data.transaction.tip).toFixed(2)
            : null
        );
        setIsManualTipAmount(data.isManualTipAmount);
        setAppState((prevAppState) => ({ ...prevAppState, receiptData: data }));
      } catch (error) {
        console.error("Error fetching receipt data:", error);
      }
    };

    const getQrCode = async (sessionId) => {
      try {
        const response = await fetch(`${server.api}/generateQrCode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data.url);
        setQrCode(data.qrCode);
      } catch (error) {
        console.error("Error fetching QR code:", error);
      }
    };

    const startSession = () => {
      if (appState.sessionId) {
        socket.emit("startSession", { sessionId: appState.sessionId });
      }
    };

    // Only make API calls if sessionId exists
    if (appState.sessionId) {
      getReceiptData(appState.sessionId);
      getQrCode(appState.sessionId);
    }

    const handleConnect = () => {
      setIsConnected(true);
      // Re-claim creator status on every (re)connect, so a restarted server
      // re-learns the host under the new socket id.
      startSession();
    };

    socket.on("connect", handleConnect);

    // Fire immediately too, in case the socket is already connected on mount.
    if (socket.connected) startSession();

    return () => {
      socket.off("connect", handleConnect);
    };
  }, []);

  const handleSessionMembersChanged = (sessionMembers) => {
    setSessionMembers(sessionMembers);
  };

  useEffect(() => {
    if (appState.sessionId == null) {
      router.push("/capture-receipt");
    }
  }, [appState.sessionId, router]);

  const handleSetMySubtotals = () => {
    // We're not showing subtotals on this page, so no need to do anything here
    return false;
  };

  const [myCheckedItems, setMyCheckedItems] = useState([]);

  const handleSetMyCheckedItems = (newMyCheckedItems) => {
    setMyCheckedItems(newMyCheckedItems);
  };

  const [balances, setBalances] = useState(null);

  const handleClearAppState = () => {
    setAppState({ sessionId: null });
  };

  async function saveTipAmount(sessionId, tip) {
    try {
      socket.emit("tipAmountChanged", {
        sessionId,
        tip
      });

      const response = await fetch(`${server.api}/setTipAmount`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sessionId, tip })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
    } catch (error) {
      console.error("Error:", error);
    }
  }

  const debouncedSaveTipAmount = useCallback(
    debounce((sessionId, tip) => {
      let tipAmount = parseFloat(tip) || 0; // Float here to save in the database
      saveTipAmount(sessionId, tipAmount);
    }, 500),
    []
  );

  const handleSetTipAmount = (tip) => {
    setTipAmount(tip); // String here to render in the input field
    setIsManualTipAmount(true);

    debouncedSaveTipAmount(appState.sessionId, tip);
  };

  return (
    isContainerReady && (
      <>
        {appState.sessionId &&
        appState.receiptData &&
        appState.receiptData.transaction &&
        isConnected ? (
          <Container $isVisible={isContainerVisible}>
            <Instructions>Show this code to everyone</Instructions>
            <Card>
              <QRCode src={qrCode} draggable={false} />
              <SessionMembersIndicator
                isConnected={isConnected}
                sessionMembers={sessionMembers}
              />
            </Card>
            <Gap />
            {(tipAmount == null || isManualTipAmount === true) && (
              <>
                <Instructions>Record tip amount</Instructions>
                <FormFieldWithSuggestions>
                  <Suggestions>
                    <Suggestion
                      onClick={() => {
                        handleSetTipAmount(
                          (
                            Math.round(
                              (appState.receiptData.transaction.total -
                                appState.receiptData.transaction.tax) *
                                18
                            ) / 100
                          ).toFixed(2)
                        );
                      }}
                      $isSelected={
                        parseFloat(tipAmount) ===
                        Math.round(
                          (appState.receiptData.transaction.total -
                            appState.receiptData.transaction.tax) *
                            18
                        ) /
                          100
                      }
                    >
                      18%
                    </Suggestion>
                    <Suggestion
                      onClick={() => {
                        handleSetTipAmount(
                          (
                            Math.round(
                              (appState.receiptData.transaction.total -
                                appState.receiptData.transaction.tax) *
                                20
                            ) / 100
                          ).toFixed(2)
                        );
                      }}
                      $isSelected={
                        parseFloat(tipAmount) ===
                        Math.round(
                          (appState.receiptData.transaction.total -
                            appState.receiptData.transaction.tax) *
                            20
                        ) /
                          100
                      }
                    >
                      20%
                    </Suggestion>
                    <Suggestion
                      onClick={() => {
                        handleSetTipAmount(
                          (
                            Math.round(
                              (appState.receiptData.transaction.total -
                                appState.receiptData.transaction.tax) *
                                22
                            ) / 100
                          ).toFixed(2)
                        );
                      }}
                      $isSelected={
                        parseFloat(tipAmount) ===
                        Math.round(
                          (appState.receiptData.transaction.total -
                            appState.receiptData.transaction.tax) *
                            22
                        ) /
                          100
                      }
                    >
                      22%
                    </Suggestion>
                  </Suggestions>
                  <FormFieldWithPrefix>
                    <FormField
                      type="text"
                      id="manualTipAmount"
                      value={tipAmount || ""}
                      onChange={(e) => {
                        handleSetTipAmount(e.target.value);
                      }}
                      placeholder="0.00"
                      spellCheck="false"
                      $textIndent="1.5rem"
                      $prefix="$"
                    />
                    <Prefix>$</Prefix>
                  </FormFieldWithPrefix>
                </FormFieldWithSuggestions>
                <Gap />
              </>
            )}
            <Instructions>Select the items that you ordered</Instructions>
            <ItemsList
              joinedFrom="present-qr"
              sessionId={appState.sessionId}
              onSubtotalsChange={handleSetMySubtotals}
              onMyCheckedItemsChange={handleSetMyCheckedItems}
              myCheckedItems={myCheckedItems}
              onSessionMembersChanged={handleSessionMembersChanged}
              onBalancesChange={setBalances}
            />
            <Gap />
            {balances && (
              <>
                <Instructions>Who owes what</Instructions>
                <BalancesBreakdown
                  participants={balances.participants}
                  payerAmount={balances.payerAmount}
                  grandTotal={balances.grandTotal}
                />
                <Gap />
              </>
            )}
            <Button
              onClick={handleClearAppState}
              $size="large"
              $isDestructive={true}
            >
              Stop sharing
            </Button>
            <Gap />
          </Container>
        ) : (
          <Container isVisible={isContainerVisible}>
            <Instructions>Please wait...</Instructions>
          </Container>
        )}
      </>
    )
  );
};

export default QrPage;
