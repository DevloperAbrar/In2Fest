import React from "react";
import { showError } from "../../../components/common/Toast";

// Keeps a crash inside a modal from taking down the whole page.
// The parent passes onClose (closes the modal) and a changing `key` so the boundary resets next time.
export default class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("[Gym modal crashed]", error);
    showError("Something went wrong in this window. Please try again.");
    if (this.props.onClose) this.props.onClose();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}