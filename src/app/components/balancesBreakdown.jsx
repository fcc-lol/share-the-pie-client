"use client";

import React from "react";
import styled from "styled-components";
import FormattedPrice from "@/app/components/formattedPrice";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 1.25rem 1.25rem 1.25rem;
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

const Person = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: ${(props) =>
    props.$muted ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 255, 255, 1)"};
`;

const Dot = styled.span`
  width: 0.5rem;
  height: 0.5rem;
  min-width: 0.5rem;
  border-radius: 0.5rem;
  display: inline-block;
  background-color: ${(props) => props.theme.connectedColor};
`;

const Amount = styled.div`
  font-variant-numeric: tabular-nums;
  color: ${(props) =>
    props.$muted ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 255, 255, 1)"};
`;

const BalancesBreakdown = ({
  participants = [],
  payerAmount = 0,
  grandTotal = 0,
}) => {
  return (
    <Wrapper>
      {participants.length === 0 ? (
        <Row>
          <Person $muted>No one has claimed items yet</Person>
        </Row>
      ) : (
        participants.map((participant, index) => (
          <Row key={participant.id}>
            <Person>
              <Dot />
              Person {index + 1}
            </Person>
            <Amount>
              <FormattedPrice value={participant.amount} />
            </Amount>
          </Row>
        ))
      )}
      <Row>
        <Person>You</Person>
        <Amount>
          <FormattedPrice value={payerAmount} />
        </Amount>
      </Row>
      <Row>
        <Person $muted>Total</Person>
        <Amount $muted>
          <FormattedPrice value={grandTotal} />
        </Amount>
      </Row>
    </Wrapper>
  );
};

export default BalancesBreakdown;
