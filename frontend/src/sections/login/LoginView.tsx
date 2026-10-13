'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

interface LoginViewProps {
  // Set when an open page found its session had ended
  sessionExpired?: boolean;
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: '#F8FAFC',
    transition: 'background-color 0.15s ease',
    '& fieldset': { borderColor: '#E2E8F0' },
    '&:hover fieldset': { borderColor: '#CBD5E1' },
    '&.Mui-focused': { bgcolor: '#FFFFFF' },
    '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: '2px' },
  },
  '& .MuiOutlinedInput-input': {
    py: '14px',
    // A saved password must not repaint the box in the browser's own colour
    '&:-webkit-autofill': { WebkitBoxShadow: '0 0 0 1000px #F8FAFC inset !important' },
  },
  '& .MuiInputAdornment-positionStart': { color: '#94A3B8' },
  // Edge adds its own show-password eye; ours replaces it
  '& input::-ms-reveal, & input::-ms-clear': { display: 'none' },
};

export default function LoginView({ sessionExpired = false }: LoginViewProps) {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read the boxes themselves: a browser can fill in saved details without telling React
    const form = new FormData(e.currentTarget);
    const enteredUsername = String(form.get('username') ?? '').trim();
    const enteredPassword = String(form.get('password') ?? '');
    if (!enteredUsername || !enteredPassword) {
      setError('Enter your username and password.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      // The backend checks the password and answers with an http-only session cookie
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: enteredUsername, password: enteredPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // Only a wrong username or password is explained; anything else is the server's problem
        throw new Error(
          res.status === 401 && body?.message ? body.message : 'Could not sign in right now. Please try again in a moment.',
        );
      }
      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Could not reach the server. Check your connection.'
          : err instanceof Error
            ? err.message
            : 'Could not sign in',
      );
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#FFFFFF' }}>
      {/* Brand panel: wide screens only */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '1 1 50%',
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#0B1220',
          color: '#FFFFFF',
          // An even dot grid across the whole panel
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: 'clamp(5rem, 10vw, 9rem)',
              lineHeight: 1,
              letterSpacing: '0.06em',
              // The spacing after the last letter would push the word off centre
              mr: '-0.06em',
            }}
          >
            DNS
          </Typography>
          <Box sx={{ mt: 3, width: 64, height: 5, borderRadius: 3, bgcolor: '#3B82F6' }} />
        </Box>
        <Typography
          sx={{
            position: 'absolute',
            zIndex: 1,
            bottom: 32,
            fontSize: '0.8rem',
            letterSpacing: '0.04em',
            color: 'rgba(255, 255, 255, 0.45)',
          }}
        >
          For authorised staff only
        </Typography>
      </Box>

      {/* Sign-in form */}
      <Box
        sx={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 6 },
          py: 6,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          {/* The brand panel is hidden on phones, so the name goes here */}
          <Box
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              alignItems: 'center',
              px: 1.75,
              height: 40,
              borderRadius: '10px',
              bgcolor: '#0B1220',
              mb: 4,
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>DNS</Typography>
          </Box>

          <Typography
            component="h1"
            sx={{ fontWeight: 800, fontSize: { xs: '1.75rem', sm: '2rem' }, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}
          >
            Sign in
          </Typography>
          <Typography sx={{ color: '#64748B', mt: 1, mb: 4, fontSize: '0.98rem' }}>
            Use the username and password you were given.
          </Typography>

          <Box component="form" noValidate onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {error ? (
              <Alert severity="error" role="alert" sx={{ borderRadius: '12px', boxShadow: 'none' }}>
                {error}
              </Alert>
            ) : (
              sessionExpired && (
                <Alert severity="info" sx={{ borderRadius: '12px', boxShadow: 'none' }}>
                  Your session has ended. Please sign in again.
                </Alert>
              )
            )}
            <TextField
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineOutlinedIcon sx={{ fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((shown) => !shown)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={fieldSx}
            />
            {/* Always clickable: a browser may have filled the boxes in without React knowing */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disableElevation
              disabled={submitting}
              endIcon={submitting ? undefined : <ArrowForwardRoundedIcon />}
              sx={{
                mt: 0.5,
                height: 52,
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1rem',
                bgcolor: '#2563EB',
                '&:hover': { bgcolor: '#1D4ED8' },
                '&.Mui-disabled': { bgcolor: '#93C5FD', color: '#FFFFFF' },
              }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
            </Button>
          </Box>

          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: '0.85rem', color: '#64748B' }}>
              Forgot your password? Ask an admin to set a new one for you.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
