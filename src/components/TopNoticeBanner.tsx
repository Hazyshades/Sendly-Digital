export function TopNoticeBanner() {
  return (
    <div
      className="sticky top-0 z-50 w-full border-b border-white/10 bg-sky-600/90 px-4 py-2 text-center text-sm font-medium text-white backdrop-blur"
      role="status"
    >
      Privy social test is over. Thanks for your help. If recepints or you privious log in with Privy, you still can sending and reciving funds.
      <span className="font-semibold text-black"> Don't send to usernames that have never logged in to Sendly.</span>
    </div>
  );
}
