// Mock Box component
export const Box = ({ children, sx, ...props }: any) => (
  <div data-testid="box" {...props}>
    {children}
  </div>
);

// Mock Avatar component
export const Avatar = ({ src, size, alt, ...props }: any) => (
  <img
    data-testid="avatar"
    src={src}
    alt={alt}
    width={size}
    height={size}
    {...props}
  />
);

// Mock Text component
export const Text = ({ children, sx, ...props }: any) => (
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
    <Icon />
  </button>
);
export const BranchName = ({ children }: any) => <span>{children}</span>;
