import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (reference: string) => void;
  loading: boolean;
}

const SearchBar = ({ onSearch, loading }: SearchBarProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Enter Reference number..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 input-3d"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
      />
      <Button type="submit" disabled={loading} className="button-3d">
        <Search className="mr-2 h-4 w-4" />
        {loading ? "Searching..." : "Search"}
      </Button>
    </form>
  );
};

export default SearchBar;
