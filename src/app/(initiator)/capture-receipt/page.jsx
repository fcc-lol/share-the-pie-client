"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import useDetectDevice from "@/app/hooks/useDetectDevice";
import chooseServer from "@/app/utils/chooseServer";
import styled from "styled-components";
import { useAppContext } from "../../AppContext";
import Container from "@/app/components/container";
import Instructions from "@/app/components/instructions";
import Button from "@/app/components/button";
import Spinner from "@/app/components/spinner";
import { motion } from "@/app/theme";

const SpinnerContainer = styled.div`
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin-top: ${(props) => (props.$isOpticallyCentered ? -1 : 0)}rem;
`;

const CameraContainer = styled.div`
  position: relative;
  top: 0;
  bottom: 0;
  height: auto;
  min-height: calc(100% - 8rem);
  background: rgba(255, 255, 255, 0.125);
  width: auto;
  object-fit: cover;
  border-radius: ${(props) => props.theme.surfaceBorderRadius};
  flex: 1;
  overflow: hidden;
  transition-property: opacity, transform;
  transition-duration: ${(props) =>
    props.theme.motion.defaultTransitionDuration}ms;

  ${(props) =>
    props.$isUploading &&
    `
      opacity: 0.25;
      transform: scale(0.8)
    `};
`;

const CameraLoading = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  z-index: 2;
  display: flex;
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
`;

const CameraPreview = styled.video`
  height: 100%;
  width: 100%;
  object-fit: cover;
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
  transition-property: opacity;
  transition-duration: ${(props) =>
    props.theme.motion.defaultTransitionDuration}ms;
  position: absolute;
  z-index: 1;
`;

const SettingsButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 1.25rem;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;

  &:active {
    opacity: 0.75;
  }
`;

const SettingsMenu = styled.div`
  position: absolute;
  top: 3.75rem;
  right: 1rem;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  min-width: 11rem;
  border-radius: 1rem;
  background: #1c1c1c;
  border: 1px solid rgba(255, 255, 255, 0.125);
`;

const SettingsMenuLabel = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem 0.375rem 0.5rem;
`;

const SettingsOption = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.5rem;
  background: ${(props) =>
    props.$isSelected ? "rgba(255, 255, 255, 0.125)" : "transparent"};
  color: ${(props) =>
    props.$isSelected ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.6)"};
  font-size: 1rem;
  font-weight: ${(props) => (props.$isSelected ? 600 : 400)};
  text-align: left;
  cursor: pointer;

  &:active {
    opacity: 0.75;
  }
`;

const GearIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      stroke="currentColor"
      strokeWidth="1.75"
    />
  </svg>
);

const PARSING_MODES = [
  { value: "VERYFI", label: "Veryfi" },
  { value: "CLAUDE", label: "Claude" },
  { value: "GPT", label: "GPT" },
  { value: "SAMPLE", label: "Sample" }
];

const Camera = () => {
  const server = chooseServer();
  const { isMobile } = useDetectDevice();
  const router = useRouter();
  const { appState, setAppState } = useAppContext();
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [isContainerVisible, setIsContainerVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Effective parsing mode; unset means "use the server default".
  const parsingMode = appState.parsingMode || "VERYFI";

  const handleSelectParsingMode = (mode) => {
    setAppState((prev) => ({ ...prev, parsingMode: mode }));
    setShowSettings(false);
  };

  useEffect(() => {
    setIsContainerReady(true);

    setTimeout(() => {
      setIsContainerVisible(true);
    }, motion.delayToShowContainer);
  }, []);

  async function uploadDocument(imageData) {
    try {
      const response = await fetch(`${server.api}/parseReceiptImage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: imageData,
          ...(appState.parsingMode
            ? { parsingMode: appState.parsingMode }
            : {})
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error:", error);
    }
  }
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const getVideo = useCallback(() => {
    const videoObj = isMobile
      ? {
          facingMode: { exact: "environment" },
          width: { ideal: 3264 / 2 },
          height: { ideal: 2448 / 2 }
        }
      : true;

    navigator.mediaDevices
      .getUserMedia({
        video: videoObj,
        audio: false
      })
      .then((stream) => {
        let video = videoRef.current;
        video.srcObject = stream;
        setTimeout(() => {
          setIsCameraReady(true);
        }, motion.delayToShowCamera);
      })
      .catch((error) => {
        setIsCameraReady(false);
        console.error("Error accessing camera: ", error);
      });
  }, [isMobile]);

  const takePicture = async () => {
    const video = videoRef.current;
    video.pause();

    setIsUploading(true);

    setTimeout(async () => {
      const width = 3264 / 2;
      const height = 2448 / 2;
      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, width, height);
      const imageData = canvas.toDataURL("image/png");

      try {
        let data = await uploadDocument(imageData);
        setIsContainerVisible(false);
        setAppState((prev) => ({ ...prev, sessionId: data.sessionId }));
        setTimeout(() => {
          video.srcObject.getTracks()[0].stop();
          router.push("/add-handles");
        }, motion.delayBetweenPages);
      } catch (error) {
        alert(error);
      }
    }, 200);
  };

  useEffect(() => {
    const hasSessionId =
      (typeof window !== "undefined" &&
        localStorage.getItem("appState") &&
        JSON.parse(localStorage.getItem("appState")).sessionId) ||
      false;

    hasSessionId ? router.push("/present-qr") : getVideo();
  }, [getVideo, router]);

  let instructionText;
  if (!isCameraReady) {
    instructionText = "Loading camera...";
  } else if (isUploading) {
    instructionText = "Processing receipt...";
  } else {
    instructionText = "Scan a group receipt";
  }

  return (
    isContainerReady && (
      <Container isFixedHeight={true} isVisible={isContainerVisible}>
        <SettingsButton
          type="button"
          onClick={() => setShowSettings((open) => !open)}
          aria-label="Receipt parsing settings"
        >
          <GearIcon />
        </SettingsButton>
        {showSettings && (
          <SettingsMenu>
            <SettingsMenuLabel>Receipt parser</SettingsMenuLabel>
            {PARSING_MODES.map((mode) => (
              <SettingsOption
                key={mode.value}
                type="button"
                $isSelected={parsingMode === mode.value}
                onClick={() => handleSelectParsingMode(mode.value)}
              >
                {mode.label}
              </SettingsOption>
            ))}
          </SettingsMenu>
        )}
        <Instructions>{instructionText}</Instructions>
        {isUploading && (
          <SpinnerContainer $isOpticallyCentered={true}>
            <Spinner />
          </SpinnerContainer>
        )}
        <CameraContainer $isUploading={isUploading}>
          <CameraPreview
            ref={videoRef}
            autoPlay={true}
            muted={true}
            playsInline={true}
            $isVisible={isCameraReady}
          />
          <CameraLoading $isVisible={!isCameraReady}>
            <SpinnerContainer $isOpticallyCentered={false}>
              <Spinner />
            </SpinnerContainer>
          </CameraLoading>
        </CameraContainer>
        <Button
          onClick={takePicture}
          $size="large"
          disabled={!isCameraReady || isUploading}
        >
          Scan
        </Button>
        <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
      </Container>
    )
  );
};

export default Camera;
