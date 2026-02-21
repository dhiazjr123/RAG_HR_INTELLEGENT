// components/documents-manager.tsx
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { FileText, Download, Trash2, Filter, Search, Eye, X } from "lucide-react";
import { useDocuments } from "@/components/documents-context";
import FileUploadButton from "@/components/file-upload-button";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/language-provider";

export function DocumentsManager() {
  const {
    documents,
    removeDocument,
    addFromFiles,
  } = useDocuments();
  const { t } = useLanguage();

  // State untuk search dan filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "CV" | "JD">("all");
  const [selectedDoc, setSelectedDoc] = useState<typeof documents[0] | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Filter dan search documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter berdasarkan tipe (CV atau JD)
    if (filterType !== "all") {
      filtered = filtered.filter((doc) => {
        const nameLower = doc.name.toLowerCase();
        if (filterType === "CV") {
          return nameLower.includes("cv") || nameLower.includes("resume") || nameLower.includes("curriculum");
        } else if (filterType === "JD") {
          return nameLower.includes("jd") || nameLower.includes("job") || nameLower.includes("description") || nameLower.includes("requirement");
        }
        return true;
      });
    }

    // Search berdasarkan nama dokumen
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((doc) =>
        doc.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [documents, searchQuery, filterType]);

  const downloadFile = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewDetail = (doc: typeof documents[0]) => {
    setSelectedDoc(doc);
    setShowDetailDialog(true);
  };

  return (
    <main className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Search & Filter Bar */}
      <Card className="bg-card/70 glass soft-shadow">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("documents.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "all" | "CV" | "JD")}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">{t("documents.filterAll")}</option>
                <option value="CV">{t("documents.filterCV")}</option>
                <option value="JD">{t("documents.filterJD")}</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(searchQuery || filterType !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="bg-card/70 glass soft-shadow hover-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("documents.manage")}
            {filteredDocuments.length !== documents.length && (
              <Badge variant="secondary" className="ml-2">
                {filteredDocuments.length} dari {documents.length}
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            <FileUploadButton
              onSelectFiles={addFromFiles}
              label={`Upload Document${documents.length > 0 ? ` (${documents.length})` : ""}`}
              variant="outline"
              size="sm"
              className="gap-2 ring-ambient btn-gradient"
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto table-row-hover">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Size</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Upload Date</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length > 0 ? (
                  filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-2 text-sm text-foreground font-medium">{doc.name}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">{doc.size}</td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">{doc.uploadDate}</td>
                      <td className="py-3 px-2">
                        <Badge 
                          variant={doc.status === "Processed" ? "default" : "secondary"} 
                          className={cn("text-xs", doc.status === "Processed" && "btn-gradient")}
                        >
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ring-ambient transition-all duration-300 ease-in-out hover:scale-110 hover:bg-purple-500/20 hover:text-purple-500 active:scale-95"
                            onClick={() => handleViewDetail(doc)}
                            title="Detail & Preview"
                          >
                            <Eye className="h-4 w-4 transition-transform duration-300 hover:scale-110" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ring-ambient transition-all duration-300 ease-in-out hover:scale-110 hover:bg-blue-500/20 hover:text-blue-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => downloadFile(doc.file)}
                            disabled={!doc.file}
                            title="Download"
                          >
                            <Download className="h-4 w-4 transition-transform duration-300 hover:translate-y-[-2px]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ring-ambient transition-all duration-300 ease-in-out hover:scale-110 hover:bg-red-500/20 hover:text-red-500 active:scale-95"
                            onClick={() => removeDocument(doc.id)}
                            aria-label={`Delete ${doc.name}`}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 transition-transform duration-300 hover:rotate-12" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      {searchQuery || filterType !== "all" 
                        ? "Tidak ada dokumen yang sesuai dengan filter."
                        : "Belum ada dokumen. Klik Upload Document di atas tabel."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail & Preview Dialog */}
      <Dialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        title="Detail & Pratinjau Dokumen"
        className="max-w-5xl"
      >
        {selectedDoc && (
          <div className="space-y-6">
            {/* Metadata Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                Metadata Lengkap
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nama Dokumen</label>
                  <p className="text-sm text-foreground mt-1">{selectedDoc.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipe File</label>
                  <p className="text-sm text-foreground mt-1">{selectedDoc.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ukuran</label>
                  <p className="text-sm text-foreground mt-1">{selectedDoc.size}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tanggal Upload</label>
                  <p className="text-sm text-foreground mt-1">{selectedDoc.uploadDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge 
                    variant={selectedDoc.status === "Processed" ? "default" : "secondary"} 
                    className={cn("mt-1", selectedDoc.status === "Processed" && "btn-gradient")}
                  >
                    {selectedDoc.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID Dokumen</label>
                  <p className="text-sm text-foreground font-mono mt-1 break-all">{selectedDoc.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID Pengunggah</label>
                  <p className="text-sm text-foreground font-mono mt-1 break-all">
                    {selectedDoc.uploadedBy || "Tidak tersedia"}
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Text Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                Pratinjau Teks (Hasil Ekstraksi AI)
              </h3>
              {selectedDoc.parsedText ? (
                <div className="relative">
                  <Textarea
                    value={selectedDoc.parsedText}
                    readOnly
                    className="min-h-[400px] font-mono text-sm bg-muted/30 border-border resize-none"
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {selectedDoc.parsedText.length} karakter • {selectedDoc.parsedText.split(/\s+/).length} kata
                  </div>
                </div>
              ) : selectedDoc.status === "Processing" ? (
                <div className="p-4 rounded-lg bg-muted/30 border border-border text-center text-sm text-muted-foreground">
                  Dokumen sedang diproses. Pratinjau akan tersedia setelah proses selesai.
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/30 border border-border text-center text-sm text-muted-foreground">
                  Pratinjau teks tidak tersedia untuk dokumen ini.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowDetailDialog(false)}
              >
                Tutup
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  if (selectedDoc.file) {
                    downloadFile(selectedDoc.file);
                  }
                }}
                disabled={!selectedDoc.file}
                className="btn-gradient"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}
