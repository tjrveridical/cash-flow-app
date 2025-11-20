"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("quickbooks");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleImport() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    form.append("sourceSystem", source);

    const res = await fetch("/api/import", {
      method: "POST",
      body: form,
    });

    const json = await res.json();
    setResult(json);
    setLoading(false);
  }

  return (
    <div className="flex justify-center p-10 bg-zinc-50">
      <Card className="w-full max-w-xl shadow-md border border-zinc-200 bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-700">
            CSV Import
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Source system */}
          <div className="space-y-2">
            <Label>Source System</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Choose source…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quickbooks">QuickBooks</SelectItem>
                <SelectItem value="paylocity">Paylocity</SelectItem>
                <SelectItem value="pipedrive">Pipedrive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* Import button */}
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? "Importing…" : "Import CSV"}
          </Button>

          {/* Progress */}
          {loading && <Progress value={50} className="h-2" />}

          {/* Results */}
          {result && (
            <Alert className="border border-amber-300/40 bg-amber-50/40">
              <AlertTitle>{result.success ? "Success" : "Failed"}</AlertTitle>
              <AlertDescription>
                <pre className="text-sm mt-2 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}