const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    phonenumber: {
      type: String,
      required: true,
    },
    conversation: [
      {
        role: {
          type: String,
          enum: ["user", "assistant", "system"],
        },
        content: String,
      },
    ],
    transfer: {
      type: Boolean,
      default: false,
    },
    connected: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
