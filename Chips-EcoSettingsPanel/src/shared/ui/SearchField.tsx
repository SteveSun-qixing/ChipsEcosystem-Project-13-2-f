import React from "react";
import { ChipsInput } from "@chips/component-library";

interface SearchFieldProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function SearchField({ value, placeholder, onChange }: SearchFieldProps): React.ReactElement {
  return (
    <div className="search-field">
      <ChipsInput value={value} placeholder={placeholder} onValueChange={onChange} />
    </div>
  );
}
