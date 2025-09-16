import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import InfoIcon from "@mui/icons-material/Info";
import { useLocalUserId } from "../hooks/useLocalUserId";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function AddQuestionForm({ onAdd }) {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const canAdd = prompt.trim().length > 0;
  return (
    <Stack
      spacing={1}
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ sm: "center" }}
    >
      <TextField
        fullWidth
        label="New question prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <TextField
        fullWidth
        label="Image URL (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <TextField
        fullWidth
        label="Additional Info (optional)"
        value={additionalInfo}
        onChange={(e) => setAdditionalInfo(e.target.value)}
        multiline
        rows={2}
      />
      <Button
        variant="outlined"
        disabled={!canAdd}
        onClick={async () => {
          await onAdd(
            prompt.trim(),
            imageUrl.trim() || null,
            additionalInfo.trim() || null
          );
          setPrompt("");
          setImageUrl("");
          setAdditionalInfo("");
        }}
      >
        Add
      </Button>
    </Stack>
  );
}

export default function SwipeQuiz({ adminMode }) {
  const userId = useLocalUserId();
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("idle");
  const [drag, setDrag] = useState({ active: false, startX: 0, dx: 0 });
  const [showAdmin, setShowAdmin] = useState(false);
  const [answersMap, setAnswersMap] = useState({});
  const [infoDialog, setInfoDialog] = useState({ open: false, content: "" });
  const current = questions[index];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      try {
        const qRes = await fetch(`${API_URL}/api/questions`);
        if (!qRes.ok) throw new Error("questions failed");
        const qData = await qRes.json();
        if (!cancelled) setQuestions(qData);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
      // answers are optional for initial render
      try {
        if (!userId) return;
        const map = await fetchAnswers(userId);
        if (!cancelled) setAnswersMap(map);
      } catch {}
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function fetchAnswers(uid) {
    const aRes = await fetch(`${API_URL}/api/answers/${uid}`);
    if (!aRes.ok) return {};
    const aData = await aRes.json();
    const map = {};
    for (const rec of aData || []) map[rec.questionId] = !!rec.answer;
    return map;
  }

  async function refreshAnswers() {
    if (!userId) return;
    try {
      const map = await fetchAnswers(userId);
      setAnswersMap(map);
    } catch {}
  }

  async function submit(answer) {
    if (!current) return;
    try {
      await fetch(`${API_URL}/api/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, questionId: current.id, answer }),
      });
      setAnswersMap((prev) => ({ ...prev, [current.id]: !!answer }));
      await refreshAnswers();
    } finally {
      setIndex((i) => i + 1);
      setDrag({ active: false, startX: 0, dx: 0 });
    }
  }

  useEffect(() => {
    // Refresh answers whenever navigating between questions
    refreshAnswers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ active: true, startX: e.clientX, dx: 0 });
  }

  function onPointerMove(e) {
    if (!drag.active) return;
    setDrag((prev) => ({ ...prev, dx: e.clientX - prev.startX }));
  }

  function onPointerUp() {
    if (!drag.active) return;
    const threshold = 80;
    const { dx } = drag;
    if (Math.abs(dx) > threshold) {
      submit(dx > 0);
    } else {
      // snap back
      setDrag({ active: false, startX: 0, dx: 0 });
    }
  }

  const rotation = Math.max(-15, Math.min(15, drag.dx / 10));
  const transform = `translateX(${drag.dx}px) rotate(${rotation}deg)`;
  const transition = drag.active ? "none" : "transform 0.2s ease";
  const yesOpacity = Math.max(0, Math.min(1, drag.dx / 100));
  const noOpacity = Math.max(0, Math.min(1, -drag.dx / 100));
  const prevAnswer = current ? answersMap[current.id] : undefined;
  const prevBorder =
    prevAnswer === undefined
      ? "1px solid rgba(255,255,255,0.12)"
      : prevAnswer
      ? "2px solid #2e7d32"
      : "2px solid #d32f2f";
  const firstUnansweredIndex = React.useMemo(() => {
    if (!questions.length) return -1;
    for (let i = 0; i < questions.length; i++) {
      if (answersMap[questions[i].id] === undefined) return i;
    }
    return -1;
  }, [questions, answersMap]);
  const canSkipToUnanswered =
    prevAnswer !== undefined &&
    firstUnansweredIndex !== -1 &&
    index !== firstUnansweredIndex;

  async function addQuestion(prompt, imageUrl, additionalInfo) {
    const res = await fetch(`${API_URL}/api/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        imageUrl: imageUrl || null,
        additionalInfo: additionalInfo || null,
      }),
    });
    if (!res.ok) throw new Error("Failed to add question");
    const created = await res.json();
    setQuestions((qs) => [...qs, created]);
  }

  async function saveQuestion(q) {
    const res = await fetch(`${API_URL}/api/questions/${q.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: q.prompt,
        imageUrl: q.imageUrl || null,
        additionalInfo: q.additionalInfo || null,
      }),
    });
    if (!res.ok) throw new Error("Failed to save question");
  }

  async function deleteQuestion(id) {
    const res = await fetch(`${API_URL}/api/questions/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete question");
    setQuestions((qs) => qs.filter((q) => q.id !== id));
    if (index >= questions.length - 1) setIndex(Math.max(0, index - 1));
  }

  return (
    <Box sx={{ userSelect: "none", touchAction: "pan-y" }}>
      {adminMode && (
        <Stack
          direction="row"
          justifyContent="flex-end"
          sx={{ mb: 2 }}
        >
          <Button size="small" onClick={() => setShowAdmin((v) => !v)}>
            {showAdmin ? "Close Admin" : "Admin"}
          </Button>
        </Stack>
      )}
      {status === "loading" && <Typography>Loading questions...</Typography>}
      {status === "error" && (
        <Typography color="error">Failed to load questions.</Typography>
      )}
      {!showAdmin && status === "ready" && !current && (
        <Box>
          <Typography sx={{ mb: 2 }}>
            All done! Thanks for answering.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              variant="text"
              disabled={index === 0}
              onClick={() => {
                setIndex((i) => Math.max(0, i - 1));
                setDrag({ active: false, startX: 0, dx: 0 });
              }}
            >
              Back
            </Button>
          </Box>
        </Box>
      )}
      {!showAdmin && current && (
        <Box sx={{ position: "relative", height: 300, width: 300, mx: "auto" }}>
          <Card
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            sx={{
              position: "absolute",
              inset: 0,
              transform,
              transition,
              border: prevBorder,
            }}
          >
            {current.imageUrl && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${current.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.35,
                }}
              />
            )}
            <CardContent sx={{ position: "relative" }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Question {index + 1}:</strong> {current.prompt}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "text.secondary",
                  alignItems: "center",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <ArrowBackIosNewIcon
                    color={prevAnswer === false ? "error" : "inherit"}
                  />
                  <Typography
                    color={prevAnswer === false ? "error" : "inherit"}
                  >
                    No
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography
                    color={prevAnswer === true ? "success" : "inherit"}
                  >
                    Yes
                  </Typography>
                  <ArrowForwardIosIcon
                    color={prevAnswer === true ? "success" : "inherit"}
                  />
                </Stack>
              </Box>
            </CardContent>
            {prevAnswer !== undefined && (
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  right: 12,
                  bottom: 12,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: prevAnswer ? "success.main" : "error.main",
                  color: "common.white",
                  zIndex: 1,
                }}
              >
                Previously answered: {prevAnswer ? "Yes" : "No"}
              </Typography>
            )}
          </Card>
          <Typography
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              color: "error.main",
              opacity: noOpacity,
              fontSize: { xs: 48, sm: 64 },
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: "uppercase",
              textShadow:
                "3px 3px 0px #000, -3px -3px 0px #000, 3px -3px 0px #000, -3px 3px 0px #000, 0 0 12px rgba(0,0,0,0.9)",
              zIndex: 1,
            }}
            style={{
              transform: `translate(-50%, -50%) scale(${1 + noOpacity * 0.3})`,
            }}
          >
            No
          </Typography>
          <Typography
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              color: "success.main",
              opacity: yesOpacity,
              fontSize: { xs: 48, sm: 64 },
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: "uppercase",
              textShadow:
                "3px 3px 0px #000, -3px -3px 0px #000, 3px -3px 0px #000, -3px 3px 0px #000, 0 0 12px rgba(0,0,0,0.9)",
              zIndex: 1,
            }}
            style={{
              transform: `translate(-50%, -50%) scale(${1 + yesOpacity * 0.3})`,
            }}
          >
            Yes
          </Typography>
          <Box
            sx={{
              position: "absolute",
              bottom: current && current.additionalInfo ? -88 : -56,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Button
              variant="text"
              disabled={index === 0}
              onClick={() => {
                setIndex((i) => Math.max(0, i - 1));
                setDrag({ active: false, startX: 0, dx: 0 });
              }}
            >
              Back
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setIndex((i) => i + 1);
                setDrag({ active: false, startX: 0, dx: 0 });
              }}
            >
              Skip
            </Button>
          </Box>
        </Box>
      )}
      {!showAdmin && current && current.additionalInfo && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Button
            variant="text"
            startIcon={<InfoIcon />}
            onClick={() =>
              setInfoDialog({ open: true, content: current.additionalInfo })
            }
            sx={{ color: "text.secondary" }}
          >
            Why are we asking this?
          </Button>
        </Box>
      )}
      {!showAdmin && canSkipToUnanswered && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mt: current && current.additionalInfo ? 5 : 7,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => {
              setIndex(firstUnansweredIndex);
              setDrag({ active: false, startX: 0, dx: 0 });
            }}
          >
            Skip to unanswered question
          </Button>
        </Box>
      )}
      {showAdmin && (
        <Paper elevation={1} sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Manage Questions</Typography>
            {questions.map((q, idx) => (
              <Stack
                key={q.id}
                spacing={1}
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ sm: "center" }}
              >
                <TextField
                  fullWidth
                  label={`Q${idx + 1} Prompt`}
                  value={q.prompt}
                  onChange={(e) =>
                    setQuestions((list) =>
                      list.map((it) =>
                        it.id === q.id ? { ...it, prompt: e.target.value } : it
                      )
                    )
                  }
                />
                <TextField
                  fullWidth
                  label="Image URL (optional)"
                  value={q.imageUrl || ""}
                  onChange={(e) =>
                    setQuestions((list) =>
                      list.map((it) =>
                        it.id === q.id
                          ? { ...it, imageUrl: e.target.value }
                          : it
                      )
                    )
                  }
                />
                <TextField
                  fullWidth
                  label="Additional Info (optional)"
                  value={q.additionalInfo || ""}
                  onChange={(e) =>
                    setQuestions((list) =>
                      list.map((it) =>
                        it.id === q.id
                          ? { ...it, additionalInfo: e.target.value }
                          : it
                      )
                    )
                  }
                  multiline
                  rows={2}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => saveQuestion(q)}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => deleteQuestion(q.id)}
                  >
                    Delete
                  </Button>
                </Stack>
              </Stack>
            ))}
            <AddQuestionForm onAdd={addQuestion} />
          </Stack>
        </Paper>
      )}
      <Dialog
        open={infoDialog.open}
        onClose={() => setInfoDialog({ open: false, content: "" })}
      >
        <DialogTitle>Why are we asking this?</DialogTitle>
        <DialogContent>
          <Typography>{infoDialog.content}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialog({ open: false, content: "" })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
