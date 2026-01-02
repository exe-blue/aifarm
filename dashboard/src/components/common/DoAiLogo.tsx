import Image from "next/image";

export const DoAiLogo = ({ 
  size = "md",
  className = ""
}: { 
  size?: "sm" | "md" | "lg";
  className?: string;
}) => {
  const sizes = {
    sm: { width: 120, height: 40 },
    md: { width: 180, height: 60 },
    lg: { width: 240, height: 80 },
  };

  const { width, height } = sizes[size];

  return (
    <div className={`relative ${className}`}>
      {/* Dark Mode Logo */}
      <Image
        src="/logo-dark.png"
        alt="DoAi.me Logo"
        width={width}
        height={height}
        className="dark:block hidden"
        priority
      />
      
      {/* Light Mode Logo */}
      <Image
        src="/logo-light.png"
        alt="DoAi.me Logo"
        width={width}
        height={height}
        className="dark:hidden block"
        priority
      />
    </div>
  );
};
