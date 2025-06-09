import React from 'react';

// Mock components for testing - using any types is legitimate here
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock Box component
export const Box = ({ children, ...props }: any) => (
  <div data-testid="box" {...props}>
    {children}
  </div>
);

// Mock Text component
export const Text = ({ children, ...props }: any) => (
  <span data-testid="text" {...props}>
    {children}
  </span>
);

// Mock other components as needed
export const PageLayout = ({ children }: any) => <div>{children}</div>;
export const Flash = ({ children }: any) => <div>{children}</div>;
export const Spinner = () => <div>Loading...</div>;
export const FormControl = ({ children }: any) => <div>{children}</div>;
FormControl.Label = ({ children }: any) => <label>{children}</label>;
FormControl.Caption = ({ children }: any) => <small>{children}</small>;
export const ButtonGroup = ({ children }: any) => <div>{children}</div>;
export const Button = ({ children, onClick, ...props }: any) => (
  <button onClick={onClick} {...props}>
    {children}
  </button>
);
export const Link = ({ children, href, ...props }: any) => (
  <a href={href} {...props}>
    {children}
  </a>
);
export const Label = ({ children }: any) => <span>{children}</span>;
export const Heading = ({ children, as: Component = 'h2', ...props }: any) => (
  <Component {...props}>{children}</Component>
);
export const Stack = ({ children }: any) => <div>{children}</div>;
export const Dialog = ({ children }: any) => (
  <div role="dialog">{children}</div>
);
Dialog.Header = ({ children }: any) => <div>{children}</div>;
export const IconButton = ({ icon: Icon, ...props }: any) => (
  <button {...props}>
    {Icon && <Icon />}
  </button>
);
export const TextInput = ({ ...props }: any) => <input {...props} />;
export const UnderlineNav = ({ children }: any) => <nav>{children}</nav>;
UnderlineNav.Item = ({ children, onSelect, ...props }: any) => (
  <a onClick={onSelect} {...props}>
    {children}
  </a>
);
export const Avatar = ({ src, size, ...props }: any) => (
  <img src={src} width={size} height={size} {...props} alt="avatar" />
);

/* eslint-enable @typescript-eslint/no-explicit-any */
