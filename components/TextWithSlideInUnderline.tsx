export default function TextWithSlideInUnderline({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span
      className="text-center
               relative after:absolute after:w-full after:bottom-0 after:left-0  after:bg-yellow-200 after:transition-all after:duration-200 after:rounded-sm after:transform after:scale-x-0 after:origin-left
        after:block group-hover:after:scale-x-100 after:z-100 after:h-1 after:pb-1"
    >
      {children}
    </span>
  );
}
