// resources/js/pages/AdminInterface/AdminWQTests.jsx
import React from "react";
import TableLayout from "../../layouts/TableLayout";
import FilterPanel from "../../components/table/FilterPanel";
import OrgWQTestModal from "../../components/water-quality-test/OrgWQTestModal";
import { FiDroplet } from "react-icons/fi";
import DashboardHeader from '../../components/DashboardHeader';

import { api } from "../../lib/api";
import { invalidateHttpCache } from "../../lib/httpCache";
import { alertSuccess, alertError } from "../../lib/alerts";
import { useWQTests } from "../shared/useWQTests.jsx";

export default function AdminWQTests({ initialLakes = [], initialTests = [], parameterCatalog = [] }) {
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
    paramCatalog,
    setTests,
    basePath,
    canPublish,
    clearAllFilters,
  } = useWQTests({ variant: 'admin', tableId: 'admin-wqtests', initialLakes, initialTests, parameterCatalog });

  return (
    <div className="dashboard-content">
      <DashboardHeader
        icon={<FiDroplet />}
        title="Water Quality Records"
        description="Browse, filter, and manage water quality test records across organizations."
      />
      <div className="dashboard-card-body">
        {toolbarNode}
        <FilterPanel open={filtersOpen} fields={filterFields} onClearAll={clearAllFilters} />
        <TableLayout
          tableId="admin-wqtests"
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

      <OrgWQTestModal open={open} onClose={() => setOpen(false)} record={selected} editable={false} parameterCatalog={paramCatalog} canPublish={canPublish}
        onTogglePublish={async () => {
          if (!selected) return;
          try {
            const res = await api(`${basePath}/${selected.id}/toggle-publish`, { method: 'POST' });
            setTests((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
            setSelected(res.data);
            if (basePath) invalidateHttpCache(basePath);
            await alertSuccess(res.data.status === 'public' ? 'Published' : 'Unpublished');
          } catch (e) {
            await alertError('Publish failed', e?.message || 'Please try again.');
          }
        }}
        onSave={(updated) => { setTests((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))); setSelected(updated); }}
      />
    </div>
  );
}
