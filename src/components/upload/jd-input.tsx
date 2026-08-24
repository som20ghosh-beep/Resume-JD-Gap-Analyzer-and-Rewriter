"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export type JdInputMode = "text" | "url";

export function JdInput({
  mode,
  onModeChange,
  text,
  onTextChange,
  url,
  onUrlChange,
}: {
  mode: JdInputMode;
  onModeChange: (mode: JdInputMode) => void;
  text: string;
  onTextChange: (text: string) => void;
  url: string;
  onUrlChange: (url: string) => void;
}) {
  return (
    <Tabs value={mode} onValueChange={(v) => onModeChange(v as JdInputMode)} className="gap-3">
      <TabsList>
        <TabsTrigger value="text">Paste text</TabsTrigger>
        <TabsTrigger value="url">From URL</TabsTrigger>
      </TabsList>
      <TabsContent value="text">
        <Textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Paste the full job description here…"
          aria-label="Job description text"
          rows={10}
          className="text-sm"
        />
      </TabsContent>
      <TabsContent value="url">
        <Input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://company.com/careers/job-posting"
          aria-label="Job posting URL"
        />
      </TabsContent>
    </Tabs>
  );
}
