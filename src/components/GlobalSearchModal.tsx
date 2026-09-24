import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Users, MapPin, Box, ArrowRight } from 'lucide-react';
import type { AuthoritativeUniverse } from '../types';
import type { NavTab } from './Sidebar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  universe: AuthoritativeUniverse | null;
  onNavigate: (tab: NavTab) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  universe,
  onNavigate
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim() || !universe) return [];
    const q = query.toLowerCase();
    const list: Array<{
      type: 'CHARACTER' | 'LOCATION' | 'OBJECT';
      id: string;
      displayName: string;
      sub: string;
      tab: NavTab;
    }> = [];

    // Characters
    if (universe.characters) {
      Object.values(universe.characters).forEach(c => {
        if (
          c.identity.displayName.toLowerCase().includes(q) ||
          c.identity.id.toLowerCase().includes(q)
        ) {
          list.push({
            type: 'CHARACTER',
            id: c.identity.id,
            displayName: c.identity.displayName,
            sub: c.roleReferences?.[0] || 'Karakter',
            tab: 'actor-actress'
          });
        }
      });
    }

    // Locations
    if (universe.locations) {
      Object.values(universe.locations).forEach(l => {
        if (
          l.identity.displayName.toLowerCase().includes(q) ||
          l.identity.id.toLowerCase().includes(q)
        ) {
          list.push({
            type: 'LOCATION',
            id: l.identity.id,
            displayName: l.identity.displayName,
            sub: `Lokasi • ${l.locationType}`,
            tab: 'dashboard'
          });
        }
      });
    }

    // Objects
    if (universe.objects) {
      Object.values(universe.objects).forEach(o => {
        if (
          o.objectName.toLowerCase().includes(q) ||
          o.identity.id.toLowerCase().includes(q)
        ) {
          list.push({
            type: 'OBJECT',
            id: o.identity.id,
            displayName: o.objectName,
            sub: `Artefak • ${o.category}`,
            tab: 'dashboard'
          });
        }
      });
    }

    return list;
  }, [query, universe]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-0">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-neutral-800 flex items-center space-x-3">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder="Cari karakter, lokasi, atau artefak di Universe..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-1">
          {results.length > 0 ? (
            results.map((res, idx) => {
              const Icon =
                res.type === 'CHARACTER'
                  ? Users
                  : res.type === 'LOCATION'
                  ? MapPin
                  : Box;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onNavigate(res.tab);
                    onClose();
                  }}
                  className="p-3 rounded-xl hover:bg-neutral-800/80 transition flex items-center justify-between cursor-pointer border border-transparent hover:border-neutral-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-indigo-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-neutral-200">
                        {res.displayName}
                      </h5>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {res.id} • {res.sub}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-[11px] text-indigo-400">
                    <span>Buka</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })
          ) : query.trim() ? (
            <div className="p-6 text-center text-xs text-neutral-500">
              Tidak ada entitas yang cocok dengan &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-neutral-500">
              Ketik nama atau ID untuk menemukan entitas semesta secara instan.
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3 bg-neutral-950/80 border-t border-neutral-800/80 text-[10px] font-mono text-neutral-500 flex items-center justify-between">
          <span>Global Search bertindak sebagai locator murni (Section 36).</span>
          <span>ESC untuk menutup</span>
        </div>
      </div>
    </div>
  );
};
