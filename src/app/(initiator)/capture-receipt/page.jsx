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

const Camera = () => {
  const server = chooseServer();
  const { isMobile } = useDetectDevice();
  const router = useRouter();
  const { appState, setAppState } = useAppContext();
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [isContainerVisible, setIsContainerVisible] = useState(false);

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
          image: imageData
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
        setAppState({ sessionId: data.sessionId });
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
