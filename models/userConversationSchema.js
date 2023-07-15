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
          enum: ["user", "assistant"],
        },
        content: String,
      },
    ],
    transfer: {
        type: Boolean,
        default: false
    }
  },
  {
    timestamps: true,
  }
);

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;