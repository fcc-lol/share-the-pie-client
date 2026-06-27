import React from "react";
import styled from "styled-components";
import FormattedPrice from "@/app/components/formattedPrice";

const ItemWrapper = styled.li`
  display: flex;
  flex-flow: row nowrap;
  font-size: 1rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0 ${(props) => props.theme.surfacePadding};
  min-height: 3.5rem;
  border-radius: ${(props) => props.theme.surfaceBorderRadius};
  background-color: ${(props) => props.theme.darkSurfaceColor};
  transition-property: opacity, color, background;
  transition-duration: ${(props) =>
    props.theme.motion.defaultTransitionDuration}ms;

  &:active {
    opacity: 0.75;
  }

  &.isCheckedByMe {
    color: rgba(0, 0, 0, 1);
    background: rgba(255, 255, 255, 1);
  }
`;

const Description = styled.p`
  margin-right: auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
`;

const CheckBox = styled.div`
  width: 24px;
  min-width: 24px;
  height: 24px;
  position: relative;

  svg {
    position: absolute;
    transition-property: all;
    transition-duration: ${(props) =>
      props.theme.motion.defaultTransitionDuration}ms;
  }

  .CheckBoxUnchecked {
    opacity: ${(props) => (props.$isChecked ? 0 : 1)};
  }

  .CheckBoxChecked {
    opacity: ${(props) => (props.$isChecked ? 1 : 0)};
  }
`;

const CheckBoxUnchecked = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="CheckBoxUnchecked"
    >
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="5"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="2"
      />
    </svg>
  );
};

const CheckBoxChecked = ({ $isChecked, isCheckedByMe }) => {
  let backgroundColor;

  if ($isChecked) {
    if (isCheckedByMe) {
      backgroundColor = "#000";
    }
    if (!isCheckedByMe) {
      backgroundColor = "#b2b2b2";
    }
  } else {
    backgroundColor = "rgb(75, 75, 75)";
  }

  let checkColor;
  if (isCheckedByMe) {
    checkColor = "#fff";
  } else {
    if ($isChecked) {
      checkColor = "#fff";
    } else {
      checkColor = "#000";
    }
  }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="CheckBoxChecked"
    >
      <path
        d="M0 6C0 2.68629 2.68629 0 6 0H18C21.3137 0 24 2.68629 24 6V18C24 21.3137 21.3137 24 18 24H6C2.68629 24 0 21.3137 0 18V6Z"
        fill={backgroundColor}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.3224 7.1578C18.7031 6.53855 17.6991 6.53855 17.0799 7.1578L10.0371 14.2006L7.10479 11.2683C6.48554 10.649 5.48152 10.649 4.86227 11.2683C4.24301 11.8876 4.24301 12.8916 4.86227 13.5108L8.90736 17.5559C8.96581 17.6144 9.02768 17.6673 9.09233 17.7147C9.71324 18.1774 10.5959 18.1269 11.1596 17.5631L19.3224 9.40033C19.9416 8.78107 19.9416 7.77706 19.3224 7.1578Z"
        fill={checkColor}
      />
    </svg>
  );
};

const Item = ({ item, mySocketId, handleClick }) => {
  const isChecked = item.checkedBy.length > 0;
  const isCheckedByMe = item.checkedBy.includes(mySocketId);

  return (
    <ItemWrapper
      onClick={handleClick}
      className={`${isChecked && "isChecked"} ${
        isChecked && isCheckedByMe && "isCheckedByMe"
      }`}
    >
      {item.checkedBy
        .filter((socketId) => socketId !== mySocketId)
        .map((socketId) => (
          <CheckBox key={socketId} $isChecked={true}>
            <CheckBoxChecked isCheckedByMe={false} $isChecked={isCheckedByMe} />
          </CheckBox>
        ))}
      <CheckBox $isChecked={isCheckedByMe}>
        <CheckBoxChecked isCheckedByMe={true} $isChecked={isCheckedByMe} />
        <CheckBoxUnchecked />
      </CheckBox>
      <Description>
        {item.quantity > 1
          ? `${item.quantity} × ${item.description}`
          : item.description}
      </Description>
      <FormattedPrice
        value={
          item.price / (item.checkedBy.length > 0 ? item.checkedBy.length : 1)
        }
      />
    </ItemWrapper>
  );
};

export default Item;
