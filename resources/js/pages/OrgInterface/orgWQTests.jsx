// resources/js/pages/OrgInterface/OrgWQTests.jsx
import React from "react";
import { FiDroplet } from "react-icons/fi";
import DashboardHeader from "../../components/DashboardHeader";
import TableLayout from "../../layouts/TableLayout";
import FilterPanel from "../../components/table/FilterPanel";
import OrgWQTestModal from "../../components/water-quality-test/OrgWQTestModal";
import { api } from "../../lib/api";
import { invalidateHttpCache } from "../../lib/httpCache";
import { alertSuccess, alertError, alertWarning } from "../../lib/alerts";
import { useWQTests } from "../shared/useWQTests.jsx";

export default function OrgWQTests({ initialLakes = [], initialTests = [], parameterCatalog = [] }) {
  const {
    toolbarNode,
    filterFields,
    filtersOpen,
    setFiltersOpen,
    displayColumns,
    filtered,
    sorted,
    sort,
    handleSortChange,
    actions,
    resetSignal,
    loading,
    page,
    totalPages,
    setPage,
    open,
    setOpen,
    selected,
    setSelected,
    editing,
    paramCatalog,
    basePath,
    canPublish,
    clearAllFilters,
    setTests,
  } = useWQTests({ variant: 'org', tableId: 'org-wqtests', initialLakes, initialTests, parameterCatalog });

  return (
    <div className="dashboard-content">
      <DashboardHeader
        icon={<FiDroplet />}
        title="Water Quality Tests"
        description="Browse, filter, and manage water quality test records for this organization."
      />
      <div className="dashboard-card-body">
        {toolbarNode}
        <FilterPanel open={filtersOpen} fields={filterFields} onClearAll={clearAllFilters} />
        <TableLayout
          tableId="org-wqtests"
          columns={displayColumns}
          data={filtered}
          actions={actions}
          resetSignal={resetSignal}
          columnPicker={false}
          loading={loading}
          loadingLabel={loading ? 'Loading tests…' : null}
          serverSide={true}
          pagination={{ page, totalPages }}
          onPageChange={(p) => setPage(p)}
          sort={sort}
          onSortChange={handleSortChange}
        />
      </div>
      <OrgWQTestModal
        open={open}
        onClose={() => setOpen(false)}
        record={selected}
        editable={editing}                     // <-- edit vs view
        parameterCatalog={paramCatalog}       // optional, for add-row select
        canPublish={canPublish}
        onTogglePublish={() => {
          if (!selected) return;
          (async () => {
            try {
              const res = await api(`${basePath}/${selected.id}/toggle-publish`, { method: 'POST' });
              // backend returns updated record
              setTests((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
              setSelected(res.data);
              try { invalidateHttpCache(basePath); } catch {}
              await alertSuccess(res.data.status === 'public' ? 'Published' : 'Unpublished');
            } catch (e) {
              // fallback local toggle
              setTests((prev) =>
                prev.map((t) =>
                  t.id === selected.id
                    ? { ...t, status: t.status === "public" ? "draft" : "public" }
                    : t
                )
              );
              setSelected((s) =>
                s ? { ...s, status: s.status === "public" ? "draft" : "public" } : s
              );
              await alertWarning('Offline toggle', 'Toggled locally due to API error.');
            }
          })();
        }}
        basePath={basePath}
        onSave={(updated) => {                 // <-- persist edits from modal
          setTests((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
          setSelected(updated);
        }}
      />
    </div>
  );
}
