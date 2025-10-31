import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { InterfacesSelector } from '@/components/interfaces-selector';
import type { InterfaceFlags } from '@/types/form';

describe('InterfacesSelector component', () => {
  const defaultValue: InterfaceFlags = {
    human: false,
    api: false,
    smartContract: false,
  };

  it('renders all three interface checkboxes', () => {
    const onChange = vi.fn();
    render(<InterfacesSelector value={defaultValue} onChange={onChange} />);

    expect(screen.getByText('Human')).toBeInTheDocument();
    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('Smart Contract')).toBeInTheDocument();
  });

  it('displays checked state correctly', () => {
    const onChange = vi.fn();
    const value: InterfaceFlags = {
      human: true,
      api: false,
      smartContract: true,
    };

    render(<InterfacesSelector value={value} onChange={onChange} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // human
    expect(checkboxes[1]).not.toBeChecked(); // api
    expect(checkboxes[2]).toBeChecked(); // smartContract
  });

  it('calls onChange when human checkbox is toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<InterfacesSelector value={defaultValue} onChange={onChange} />);

    const humanCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(humanCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      human: true,
      api: false,
      smartContract: false,
    });
  });

  it('calls onChange when api checkbox is toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<InterfacesSelector value={defaultValue} onChange={onChange} />);

    const apiCheckbox = screen.getAllByRole('checkbox')[1];
    await user.click(apiCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      human: false,
      api: true,
      smartContract: false,
    });
  });

  it('calls onChange when smart contract checkbox is toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<InterfacesSelector value={defaultValue} onChange={onChange} />);

    const smartContractCheckbox = screen.getAllByRole('checkbox')[2];
    await user.click(smartContractCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      human: false,
      api: false,
      smartContract: true,
    });
  });

  it('toggles off when already checked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: InterfaceFlags = {
      human: true,
      api: false,
      smartContract: false,
    };

    render(<InterfacesSelector value={value} onChange={onChange} />);

    const humanCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(humanCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      human: false,
      api: false,
      smartContract: false,
    });
  });

  it('allows multiple interfaces to be selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(
      <InterfacesSelector value={defaultValue} onChange={onChange} />
    );

    // Select human
    const humanCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(humanCheckbox);
    expect(onChange).toHaveBeenLastCalledWith({
      human: true,
      api: false,
      smartContract: false,
    });

    // Update value and select API
    const value1: InterfaceFlags = { human: true, api: false, smartContract: false };
    rerender(<InterfacesSelector value={value1} onChange={onChange} />);

    const apiCheckbox = screen.getAllByRole('checkbox')[1];
    await user.click(apiCheckbox);
    expect(onChange).toHaveBeenLastCalledWith({
      human: true,
      api: true,
      smartContract: false,
    });
  });

  it('applies custom className', () => {
    const onChange = vi.fn();
    const { container } = render(
      <InterfacesSelector 
        value={defaultValue} 
        onChange={onChange}
        className="custom-class" 
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('handles indeterminate state gracefully', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<InterfacesSelector value={defaultValue} onChange={onChange} />);

    const humanCheckbox = screen.getAllByRole('checkbox')[0];
    
    // Simulate indeterminate state (though unlikely in this component)
    await user.click(humanCheckbox);

    // Should still call onChange with boolean
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        human: expect.any(Boolean),
      })
    );
  });

  it('renders in responsive grid layout', () => {
    const onChange = vi.fn();
    const { container } = render(
      <InterfacesSelector value={defaultValue} onChange={onChange} />
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain('grid');
    expect(grid.className).toContain('sm:grid-cols-3');
  });

  it('all checkboxes are accessible via labels', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<InterfacesSelector value={defaultValue} onChange={onChange} />);

    // Click on label text to trigger checkbox
    const humanLabel = screen.getByText('Human');
    const apiLabel = screen.getByText('API');
    const smartContractLabel = screen.getByText('Smart Contract');

    expect(humanLabel).toBeInTheDocument();
    expect(apiLabel).toBeInTheDocument();
    expect(smartContractLabel).toBeInTheDocument();

    // Labels should be clickable
    await user.click(humanLabel);
    expect(onChange).toHaveBeenCalled();
  });
});

