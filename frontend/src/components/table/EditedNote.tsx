import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { formatDateTime } from "@/utils/datetime";

interface EditedNoteProps {
  editedBy?: string | null;
  editedAt?: string | null;
  // How many times the entry has been corrected
  editCount?: number | null;
  // About the latest correction: the reason given, or else what was changed
  editNote?: string | null;
}

/** Caption under a table row that has been corrected: how often, by whom last, and the latest note. */
export default function EditedNote({ editedBy, editedAt, editCount, editNote }: EditedNoteProps) {
  if (!editedAt) return null;
  const count = editCount ?? 1;
  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography sx={{ color: "#B45309", fontSize: "0.72rem", fontWeight: 600 }}>
        {count > 1 ? `Edited ${count} times · last by ${editedBy}` : `Edited by ${editedBy}`} ·{" "}
        {formatDateTime(editedAt)}
      </Typography>
      {editNote && (
        <Typography sx={{ color: "#78716C", fontSize: "0.72rem", fontStyle: "italic", overflowWrap: "anywhere" }}>
          {count > 1 ? "Latest: " : ""}
          {editNote}
        </Typography>
      )}
    </Box>
  );
}
