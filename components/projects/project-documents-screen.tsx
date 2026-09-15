"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import {
  ProjectSectionHeader,
  ProjectSectionPrimaryLink,
} from "@/components/projects/project-section-chrome";
import { requestFormData, requestJson } from "@/lib/api/client";
import { useApiData } from "@/hooks/use-api-data";
import { formatBytes, formatDateTime } from "@/lib/utils";
import {
  FileDown,
  FileText,
  FolderOpen,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

type ProjectDocumentList = {
  documents: Array<{
    id: string;
    project_id: string;
    business_id: string;
    storage_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    uploaded_by: string;
    notes: string | null;
    created_at: string;
  }>;
};

export function ProjectDocumentsScreen({ projectId }: { projectId: string }) {
  const { data, error, isLoading } = useApiData<ProjectDocumentList>(
    `/api/projects/${projectId}/documents`,
  );
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const documents = data?.documents ?? [];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setUploadError("Choose a document to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (notes.trim()) {
      formData.append("notes", notes.trim());
    }

    setUploading(true);
    setUploadError(null);

    const result = await requestFormData<{
      document: ProjectDocumentList["documents"][number];
    }>(`/api/projects/${projectId}/documents`, formData, { notify: true });

    setUploading(false);

    if (!result.ok) {
      setUploadError(result.message);
      return;
    }

    setFile(null);
    setNotes("");
    if (typeof window !== "undefined") {
      const input = document.getElementById(
        `project-document-upload-${projectId}`,
      ) as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
    }
  }

  async function handleDelete(documentId: string) {
    const result = await requestJson<{ id: string }>(
      `/api/projects/${projectId}/documents/${documentId}`,
      { method: "DELETE", notify: true },
    );

    if (result.ok) {
      return;
    }
  }

  return (
    <div className="space-y-4">
      <ProjectSectionHeader
        title="Documents"
        description="Upload drawings, permits, invoices, and project records"
        action={
          <ProjectSectionPrimaryLink
            href={`/projects/${projectId}`}
            icon={FolderOpen}
          >
            Project overview
          </ProjectSectionPrimaryLink>
        }
      />

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <form
          onSubmit={onSubmit}
          className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]"
        >
          <div className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-600 transition hover:border-stone-400 hover:bg-stone-100">
              <UploadCloud className="h-6 w-6 text-stone-500" />
              <span>{file ? file.name : "Choose a document to upload"}</span>
              <input
                id={`project-document-upload-${projectId}`}
                type="file"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add a note for this file (optional)"
              className="min-h-20"
            />
          </div>

          <div className="flex flex-col justify-end gap-3">
            <Button
              type="submit"
              disabled={uploading || !file}
              fullWidth
              icon={Plus}
            >
              {uploading ? "Uploading..." : "Upload document"}
            </Button>
            {file ? (
              <p className="text-xs text-stone-500">{formatBytes(file.size)}</p>
            ) : null}
          </div>
        </form>
        {uploadError ? (
          <Alert className="mt-4" variant="error">
            {uploadError}
          </Alert>
        ) : null}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-500">
          Loading documents…
        </div>
      ) : error ? (
        <Alert variant="error">{error}</Alert>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No project documents yet"
          description="Upload plans, permits, pricing sheets, and other job records here."
        />
      ) : (
        <div className="grid gap-3">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-900">
                    {document.file_name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    <span>{formatBytes(document.file_size)}</span>
                    <span>•</span>
                    <span>{formatDateTime(document.created_at)}</span>
                  </div>
                  {document.notes ? (
                    <p className="mt-2 text-xs text-stone-600">
                      {document.notes}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/api/projects/${projectId}/documents/${document.id}/download`}
                  className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  <FileDown className="h-4 w-4" />
                  Download
                </Link>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => void handleDelete(document.id)}
                  icon={Trash2}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
