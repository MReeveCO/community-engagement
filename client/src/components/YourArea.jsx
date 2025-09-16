import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip
} from "@mui/material";
import { useLocalUserId } from "../hooks/useLocalUserId";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function YourArea({ refreshKey }) {
  const userId = useLocalUserId();
  const [stats, setStats] = useState([]);
  const [answers, setAnswers] = useState({});
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const [sRes, aRes, qRes] = await Promise.all([
          fetch(`${API_URL}/api/stats/answers`),
          fetch(`${API_URL}/api/answers/${userId}`),
          fetch(`${API_URL}/api/questions`),
        ]);
        if (!sRes.ok) throw new Error("stats");
        const [sData, aData, qData] = await Promise.all([
          sRes.json(),
          aRes.ok ? aRes.json() : Promise.resolve([]),
          qRes.ok ? qRes.json() : Promise.resolve([]),
        ]);
        if (!mounted) return;
        const map = {};
        for (const r of aData) map[r.questionId] = !!r.answer;
        const imgMap = {};
        for (const q of qData) imgMap[q.id] = q.imageUrl || null;
        setStats(sData);
        setAnswers(map);
        setImages(imgMap);
        setError("");
      } catch (e) {
        if (mounted) setError("Failed to load area stats");
      } finally {
        if (mounted) setLoading(false);
        }
      }
      if (userId) load();
      return () => {
        mounted = false;
      };
    }, [userId, refreshKey]);

  if (loading) return <Typography>Loading area stats...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Stack spacing={2}>
      {stats.map((s) => {
        const userAns = answers[s.questionId];
        return (
          <Paper
            key={s.questionId}
            elevation={1}
            sx={{ p: 2, position: "relative", overflow: "hidden" }}
          >
            {images[s.questionId] && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${images[s.questionId]})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.25,
                }}
              />
            )}
            <Typography
              variant="subtitle1"
              sx={{ mb: 1, position: "relative" }}
            >
              <strong>Question {stats.indexOf(s) + 1}:</strong> {s.prompt}
            </Typography>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ mb: 1, position: "relative" }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Chip
                  label={userAns === undefined ? "Unanswered" : userAns ? "Yes" : "No"}
                  color={userAns === undefined ? "default" : userAns ? "success" : "error"}
                  size="small"
                />
              </Box>
              <Box
                sx={{
                  position: "relative",
                  height: 16,
                  width: 160,
                  bgcolor: "error.main",
                  borderRadius: 1,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${s.percentTrue}%`,
                    bgcolor: "success.main",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.primary", fontSize: "0.7rem" }}>
                    {s.percentTrue}% Yes
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.primary", fontSize: "0.7rem" }}>
                    {100 - s.percentTrue}% No
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
