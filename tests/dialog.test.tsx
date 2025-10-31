// Test for the Dialog component: checks rendering, open/close functionality, and accessibility
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../src/components/ui/dialog';

describe('Dialog', () => {
  // Test basic dialog rendering and open/close functionality
  it('renders dialog with trigger and content', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>This is a test dialog</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    // Dialog should be closed by default
    expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();

    // Click trigger to open dialog
    fireEvent.click(screen.getByText('Open Dialog'));
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('This is a test dialog')).toBeInTheDocument();
  });

  // Test dialog close functionality
  it('closes dialog when close button is clicked', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>This is a test dialog</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    // Open dialog
    fireEvent.click(screen.getByText('Open Dialog'));
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();

    // Close dialog using close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
  });

  // Test dialog with header and footer
  it('renders dialog with header and footer', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>This is a test dialog</DialogDescription>
          </DialogHeader>
          <div>Dialog content</div>
          <DialogFooter>
            <button>Cancel</button>
            <button>Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    // Open dialog
    fireEvent.click(screen.getByText('Open Dialog'));
    
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('This is a test dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  // Test dialog accessibility
  it('has proper accessibility attributes', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>This is a test dialog</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    // Open dialog
    fireEvent.click(screen.getByText('Open Dialog'));
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    
    const title = screen.getByText('Test Dialog');
    expect(title).toBeInTheDocument();
    
    const description = screen.getByText('This is a test dialog');
    expect(description).toBeInTheDocument();
  });

  // Test dialog with custom className
  it('applies custom className to dialog content', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent className="custom-class">
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    // Open dialog
    fireEvent.click(screen.getByText('Open Dialog'));
    
    const dialogContent = screen.getByRole('dialog');
    expect(dialogContent).toHaveClass('custom-class');
  });

  // Test dialog close on escape key
  it('closes dialog when escape key is pressed', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    // Open dialog
    fireEvent.click(screen.getByText('Open Dialog'));
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();

    // Press escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
  });
}); 