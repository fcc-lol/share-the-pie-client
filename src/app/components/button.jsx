import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

const StyledButton = styled.button`
  background-color: ${(props) =>
    props.$backgroundColor ? props.$backgroundColor : "#fff"};
  color: ${(props) => (props.$textColor ? props.$textColor : "#000")};
  font-weight: bold;
  border: none;
  border-radius: ${(props) => props.theme.surfaceBorderRadius};
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 1.5rem;

  ${(props) =>
    props.$size === "small" &&
    `
      font-size: 1.125rem;
      line-height: 2rem;
      width: 100%;
      height: 2.5rem;
      min-height: 2.5rem;
      padding: 0 0.75rem;
    `};

  ${(props) =>
    props.$size === "large" &&
    `
      font-size: 1.125rem;
      line-height: 2rem;
      width: 100%;
      height: 3.5rem;
      min-height: 3.5rem;
    `};

  ${(props) =>
    props.$isDestructive === true &&
    `
      color: #b30000;
      background: #000;
      border: 2px solid #b30000;
    `};

  transition-property: opacity, transform;
  transition-duration: ${(props) =>
    props.theme.motion.defaultTransitionDuration}ms;

  &:active {
    opacity: 0.75;
    transform: scale(0.95);
  }

  &:disabled {
    pointer-events: none;
    opacity: 0.25;
  }
`;

const Button = ({ children, ...rest }) => {
  return <StyledButton {...rest}>{children}</StyledButton>;
};

Button.propTypes = {
  $size: PropTypes.string,
  $isDestructive: PropTypes.bool,
  $backgroundColor: PropTypes.string,
  $textColor: PropTypes.string,
};

export default Button;
