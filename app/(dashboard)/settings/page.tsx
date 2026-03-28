"use client";

import { useSession, signOut } from "next-auth/react";
import { Settings, User, Bell, Shield, LogOut, Sparkles, Moon, Globe, Mail, Check, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: profile, mutate: mutateProfile } = useSWR('/api/profile', fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 });
  
  const [aiEnabled, setAiEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profTitle, setProfTitle] = useState("");
  const [bio, setBio] = useState("");
  const [name, setName] = useState("");

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (profile) {
      setProfTitle(profile.title || "AI Career Specialist");
      setBio(profile.bio || "Helping developers master technical interviews.");
      setName(profile.name || session?.user?.name || "User");
    }
  }, [profile, session]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: profTitle, 
          bio: bio,
          name: name
        })
      });
      if (res.ok) {
        await mutateProfile();
        setIsEditingProfile(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || (!profile && !session)) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto mb-4" /> Loading Preferences...</div>;

  return (
    <div className="animate-in fade-in duration-500 font-sans w-full pb-20 p-6 lg:p-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Settings className="h-8 w-8 text-zinc-400" />
          Settings
        </h1>
        <p className="text-zinc-400 mt-2">Manage your account preferences and application settings.</p>
      </header>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-8 flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-indigo-500/10 to-transparent">
            <div className="w-24 h-24 rounded-full bg-indigo-500/20 border-4 border-zinc-800 flex items-center justify-center text-indigo-400 relative group overflow-hidden">
               {session?.user?.image ? (
                 <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <User className="h-10 w-10" />
               )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              {isEditingProfile ? (
                 <input 
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="text-2xl font-bold bg-zinc-950/50 border border-indigo-500/30 rounded-lg px-3 py-1 text-white w-full max-w-sm"
                 />
              ) : (
                 <h2 className="text-2xl font-bold text-white">{name}</h2>
              )}
              
              {isEditingProfile ? (
                 <input 
                   value={profTitle}
                   onChange={(e) => setProfTitle(e.target.value)}
                   className="mt-2 bg-zinc-950/50 border border-indigo-500/30 rounded-lg px-3 py-1 text-sm text-indigo-400 w-full max-w-sm"
                   placeholder="Professional Title"
                 />
              ) : (
                 <p className="text-indigo-400 font-medium text-sm mt-1">{profTitle}</p>
              )}
              
              <div className="mt-3">
                 {isEditingProfile ? (
                    <textarea 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="bg-zinc-950/50 border border-indigo-500/30 rounded-lg px-3 py-2 text-xs text-zinc-400 w-full max-w-md h-20 resize-none"
                      placeholder="Write a short bio..."
                    />
                 ) : (
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-md">{bio}</p>
                 )}
              </div>

              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">Pro Member</span>
                <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-zinc-800">Verified Account</span>
              </div>
            </div>
            
            <button 
              onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
              disabled={isSaving}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${isEditingProfile ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white' : 'bg-zinc-800 hover:bg-zinc-800/80 text-white border-zinc-800'}`}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditingProfile ? 'Save Changes' : 'Edit Profile'}
            </button>
          </div>
        </section>

        {/* Preferences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <h3 className="font-bold text-white">AI Search Insights</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">Personalized Matching</p>
                <p className="text-xs text-zinc-400 mt-1">AI analysis on resume matching & job alerts.</p>
              </div>
              <button 
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${aiEnabled ? 'bg-indigo-500' : 'bg-zinc-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${aiEnabled ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="h-5 w-5 text-zinc-400" />
              <h3 className="font-bold text-white">Region & Sync</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">Global Coverage</p>
                <p className="text-xs text-zinc-400 mt-1">Searching entire Indian internet.</p>
              </div>
              <div className="bg-zinc-800 px-3 py-1.5 rounded-lg text-[10px] font-bold text-zinc-400 uppercase tracking-widest border border-zinc-800">
                Active
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-4 border-t border-zinc-800">
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-2xl font-bold transition-all border border-red-500/10 active:scale-[0.99]"
          >
            <LogOut className="h-5 w-5" />
            Sign Out from Career Suite
          </button>
          <p className="text-center text-[10px] text-zinc-400 mt-4 uppercase tracking-[0.2em]">Career Suite v2.0.5 • Build Stable</p>
        </div>
      </div>
    </div>
  );
}
