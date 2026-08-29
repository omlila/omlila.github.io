import os
import shutil

class FolderGuard:
    """
    Ensures file operations are restricted to allowed directories and
    prevents catastrophic deletions.
    """
    def __init__(self, allowed_roots=None):
        self.allowed_roots = [os.path.abspath(r) for r in (allowed_roots or ['data', 'conductor'])]

    def is_safe(self, path):
        abs_path = os.path.abspath(path)
        return any(abs_path.startswith(root) for root in self.allowed_roots)

    def safe_delete(self, path):
        if not self.is_safe(path):
            raise PermissionError(f"GUARDRAIL: Attempted deletion outside sandbox: {path}")
        
        # Prevent deleting top-level project folders
        if os.path.abspath(path) in self.allowed_roots:
            raise PermissionError(f"GUARDRAIL: Cannot delete root sandbox folder: {path}")

        if os.path.isfile(path):
            os.remove(path)
        elif os.path.isdir(path):
            # Additional check: Never delete a folder containing more than 50 files in one go
            file_count = sum([len(files) for r, d, files in os.walk(path)])
            if file_count > 50:
                 print(f"[Guard] PAUSE: Mass deletion (>50 files) detected in {path}. Manual intervention required.")
                 return False
            shutil.rmtree(path)
        return True

# Initialize global guard
guard = FolderGuard()
