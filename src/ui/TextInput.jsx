import React from "react";

const textInputStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  textarea: {
    width: "100%",
    minHeight: "60px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    color: "#fff",
    padding: "8px",
    fontSize: "12px",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box"
  },
  textareaFocus: {
    borderColor: "rgba(255,255,255,0.4)",
    background: "rgba(255,255,255,0.08)"
  },
  placeholder: {
    color: "rgba(255,255,255,0.5)"
  },
  button: {
    alignSelf: "flex-end",
    background: "rgba(34, 211, 238, 0.2)",
    border: "1px solid rgba(34, 211, 238, 0.4)",
    color: "#22d3ee",
    borderRadius: "6px",
    padding: "4px 12px",
    cursor: "pointer",
    fontSize: "11px",
    transition: "all 0.2s ease",
    fontFamily: "inherit"
  },
  buttonHover: {
    background: "rgba(34, 211, 238, 0.3)",
    borderColor: "rgba(34, 211, 238, 0.6)"
  },
  buttonDisabled: {
    opacity: "0.5",
    cursor: "not-allowed"
  }
};

export default function TextInput({ 
  value, 
  onChange, 
  onKeyDown, 
  onSubmit, 
  placeholder = "Add a note...", 
  buttonText = "Add",
  disabled = false,
  style = {}
}) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  const textareaStyle = {
    ...textInputStyles.textarea,
    ...(isFocused && textInputStyles.textareaFocus),
    ...style
  };

  const buttonStyle = {
    ...textInputStyles.button,
    ...(isHovered && !disabled && textInputStyles.buttonHover),
    ...(disabled && textInputStyles.buttonDisabled)
  };

  return (
    <div style={textInputStyles.container}>
      <textarea
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        style={textareaStyle}
        disabled={disabled}
      />
      <button
        onClick={onSubmit}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled}
        style={buttonStyle}
      >
        {buttonText}
      </button>
    </div>
  );
}
