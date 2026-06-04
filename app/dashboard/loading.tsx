export default function DashboardLoading() {
  return (
    <div className="relative pt-6 pb-16 min-h-screen">
      <div className="space-y-8 w-full">
        {/* Greeting */}
        <div className="space-y-2">
          <div
            className="h-9 w-48 rounded-[var(--radius-sm)] animate-pulse"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          />
          <div
            className="h-4 w-32 rounded-[var(--radius-sm)] animate-pulse"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] p-5 space-y-4 animate-pulse"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="h-3 w-24 rounded-[var(--radius-sm)]"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                />
                <div
                  className="w-9 h-9 rounded-[var(--radius-sm)]"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                />
              </div>
              <div
                className="h-7 w-28 rounded-[var(--radius-sm)]"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              />
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
          {/* LEFT (2/3) */}
          <div className="xl:col-span-2 space-y-6 md:space-y-8">
            {/* Revenue card */}
            <div
              className="rounded-[var(--radius-lg)] p-5"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="space-y-2 animate-pulse">
                  <div
                    className="h-5 w-24 rounded-[var(--radius-sm)]"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  />
                  <div
                    className="h-3 w-40 rounded-[var(--radius-sm)]"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  />
                </div>
                <div className="space-y-2 animate-pulse">
                  <div
                    className="h-7 w-28 rounded-[var(--radius-sm)] ml-auto"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  />
                  <div
                    className="h-3.5 w-20 rounded-[var(--radius-sm)] ml-auto"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  />
                </div>
              </div>
              <div
                className="h-[260px] w-full rounded-[var(--radius-lg)] animate-pulse"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              />
            </div>

            {/* Top Products */}
            <div
              className="rounded-[var(--radius-lg)] overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-5"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div
                  className="h-4 w-44 rounded-[var(--radius-sm)] animate-pulse"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                />
                <div
                  className="h-7 w-16 rounded-[var(--radius-sm)] animate-pulse"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                />
              </div>
              <div>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-6 py-4 animate-pulse"
                    style={
                      i > 0 ? { borderTop: '1px solid var(--border)' } : undefined
                    }
                  >
                    <div
                      className="w-12 h-12 rounded-[var(--radius-lg)] shrink-0"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    />
                    <div className="flex-1 space-y-2">
                      <div
                        className="h-3.5 w-1/3 rounded-[var(--radius-sm)]"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                      />
                      <div
                        className="h-2.5 w-1/5 rounded-[var(--radius-sm)]"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT (1/3) */}
          <div className="space-y-6 md:space-y-8">
            {/* Activity feed */}
            <div
              className="rounded-[var(--radius-lg)] overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div
                  className="h-4 w-32 rounded-[var(--radius-sm)] animate-pulse"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                />
                <div
                  className="h-6 w-16 rounded-[var(--radius-sm)] animate-pulse"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                />
              </div>
              <div>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-4 animate-pulse"
                    style={
                      i > 0 ? { borderTop: '1px solid var(--border)' } : undefined
                    }
                  >
                    <div
                      className="w-10 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    />
                    <div className="flex-1 space-y-2">
                      <div
                        className="h-3 w-2/3 rounded-[var(--radius-sm)]"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                      />
                      <div
                        className="h-2 w-1/2 rounded-[var(--radius-sm)]"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div
              className="rounded-[var(--radius-lg)] p-5"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="h-4 w-28 rounded-[var(--radius-sm)] mb-5 animate-pulse"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              />
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2.5 py-4 px-2 rounded-[var(--radius-lg)] animate-pulse"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    />
                    <div
                      className="h-2.5 w-16 rounded-[var(--radius-sm)]"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
