.chips-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-inline: var(--chips-space-3);
  padding-block: var(--chips-space-2);
  border-radius: var(--chips-radius-md);
  border: none;
  cursor: pointer;
  background-color: var(--chips-color-primary);
  color: var(--chips-color-on-primary);
  font-size: 14px;
}

.chips-button:disabled {
  opacity: 0.6;
  cursor: default;
}

