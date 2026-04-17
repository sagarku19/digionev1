$root = 'c:\Users\sagar\OneDrive\Desktop\Websites\Digitalshop\digionev1\app\dashboard'

# Use .NET directly to avoid PowerShell bracket path issues
$allFiles = [System.IO.Directory]::GetFiles($root, '*.tsx', [System.IO.SearchOption]::AllDirectories)

$pattern = '#0A0A1A|#0D0D1F|#0D0E1A|dark:bg-gray-900|dark:border-gray-800|dark:text-white'

$updated = 0
foreach ($path in $allFiles) {
  $c = [System.IO.File]::ReadAllText($path)
  if (-not ($c -match $pattern)) { continue }

  # Card / panel backgrounds
  $c = $c -replace 'bg-white dark:bg-\[#0A0A1A\]',  'bg-[var(--bg-primary)]'
  $c = $c -replace 'bg-white dark:bg-\[#0D0D1F\]',  'bg-[var(--bg-primary)]'
  $c = $c -replace 'bg-white dark:bg-\[#0D0E1A\]',  'bg-[var(--bg-primary)]'
  $c = $c -replace ' dark:bg-\[#0A0A1A\]',           ' bg-[var(--bg-primary)]'
  $c = $c -replace ' dark:bg-\[#0D0D1F\]',           ' bg-[var(--bg-primary)]'
  $c = $c -replace ' dark:bg-\[#0D0E1A\]',           ' bg-[var(--bg-primary)]'

  # Input / secondary backgrounds
  $c = $c -replace 'bg-gray-50 dark:bg-gray-900\b',  'bg-[var(--bg-secondary)]'
  $c = $c -replace '\bdark:bg-gray-900\b',            'dark:bg-[var(--bg-secondary)]'
  $c = $c -replace '\bdark:hover:bg-gray-900/40\b',   'dark:hover:bg-[var(--bg-secondary)]/60'
  $c = $c -replace '\bdark:hover:bg-gray-800\b',      'dark:hover:bg-[var(--bg-secondary)]'
  $c = $c -replace '\bdark:bg-gray-800\b',            'dark:bg-[var(--bg-secondary)]'

  # Borders
  $c = $c -replace 'border-gray-200 dark:border-gray-800\b', 'border-[var(--border)]'
  $c = $c -replace 'border-gray-100 dark:border-gray-800\b', 'border-[var(--border)]'
  $c = $c -replace '\bdark:border-gray-800\b',               'dark:border-[var(--border)]'
  $c = $c -replace '\bdark:border-gray-700\b',               'dark:border-[var(--border)]'
  $c = $c -replace 'divide-gray-100 dark:divide-gray-800',   'divide-[var(--border)]'
  $c = $c -replace '\bdark:divide-gray-800\b',               'dark:divide-[var(--border)]'

  # Primary text
  $c = $c -replace 'text-gray-900 dark:text-white\b',        'text-[var(--text-primary)]'
  $c = $c -replace '\bdark:text-white\b',                    'dark:text-[var(--text-primary)]'
  $c = $c -replace '\bdark:text-gray-200\b',                 'dark:text-[var(--text-primary)]'

  # Secondary/muted text
  $c = $c -replace 'text-gray-500 dark:text-gray-400\b',     'text-[var(--text-secondary)]'
  $c = $c -replace '\bdark:text-gray-400\b',                 'dark:text-[var(--text-secondary)]'
  $c = $c -replace '\bdark:text-gray-300\b',                 'dark:text-[var(--text-secondary)]'
  $c = $c -replace '\bdark:hover:text-white\b',              'dark:hover:text-[var(--text-primary)]'
  $c = $c -replace '\bdark:hover:text-gray-200\b',           'dark:hover:text-[var(--text-primary)]'

  [System.IO.File]::WriteAllText($path, $c, [System.Text.Encoding]::UTF8)
  $rel = $path.Replace('c:\Users\sagar\OneDrive\Desktop\Websites\Digitalshop\digionev1\app\dashboard\', '')
  Write-Host "  OK $rel"
  $updated++
}

Write-Host "`nDone. $updated files updated."
