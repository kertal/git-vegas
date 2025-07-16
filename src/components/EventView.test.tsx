import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { ThemeProvider } from '@primer/react';
import { vi } from 'vitest';
import EventView from './EventView';
import { GitHubItem, GitHubEvent } from '../types';

// ... existing code ... 