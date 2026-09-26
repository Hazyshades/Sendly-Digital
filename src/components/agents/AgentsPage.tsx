import { useState } from 'react';
import { AgentsGithubPanel } from '@/components/agents/AgentsGithubPanel';
import { AgentsTwitchPanel } from '@/components/agents/AgentsTwitchPanel';

export type AgentsChannel = 'github' | 'twitch';

const CHANNELS: { id: AgentsChannel; label: string; hint: string }[] = [
  { id: 'github', label: 'GitHub', hint: 'Pay for merged PRs' },
  { id: 'twitch', label: 'Twitch', hint: 'Pay for raids' },
];

/**
 * Single Agents screen: channel switcher + pane.
 * Side rail on sm+, stacked tabs on narrow viewports (R-03).
 */
export function AgentsPage() {
  const [channel, setChannel] = useState<AgentsChannel>('github');

  return (
    <div className="flex flex-col sm:flex-row min-h-[28rem]">
      <nav
        aria-label="Agent channels"
        className="flex sm:flex-col gap-1 p-3 sm:p-4 sm:w-44 shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100 overflow-x-auto"
      >
        {CHANNELS.map((item) => {
          const active = channel === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setChannel(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`min-h-11 px-3 py-2 rounded-xl text-left transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className={`block text-xs mt-0.5 ${active ? 'text-blue-100' : 'text-gray-500'}`}>
                {item.hint}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1 min-w-0 p-4 sm:p-6">
        <header className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-gray-600">
            Pay contributors from your Internal Wallet when GitHub or Twitch events fire.
          </p>
        </header>

        {channel === 'github' ? <AgentsGithubPanel /> : <AgentsTwitchPanel />}
      </div>
    </div>
  );
}
