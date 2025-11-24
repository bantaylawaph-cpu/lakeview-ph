// resources/js/pages/ContributorInterface/contribWQTests.jsx
import React from "react";
import TableLayout from "../../layouts/TableLayout";
import FilterPanel from "../../components/table/FilterPanel";
import OrgWQTestModal from "../../components/water-quality-test/OrgWQTestModal";
import { FiDroplet } from "react-icons/fi";
import DashboardHeader from "../../components/DashboardHeader";
import { alertSuccess } from "../../lib/alerts";
import { useWQTests } from "../shared/useWQTests.jsx";

export default function ContribWQTests() {
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
    clearAllFilters,
    setTests,
  } = useWQTests({ variant: 'contrib', tableId: 'contrib-wqtests' });

  return (
    <div className="dashboard-content">
      <DashboardHeader
        icon={<FiDroplet />}
        title="Water Quality Records"
        description="Browse, filter, and manage water quality test records for your organization."
      />
      <div className="dashboard-card-body">
        {toolbarNode}
        <FilterPanel open={filtersOpen} fields={filterFields} onClearAll={clearAllFilters} />
        <TableLayout
          tableId="contrib-wqtests"
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
        editable={editing}
        parameterCatalog={paramCatalog}
        canPublish={false}
        basePath={basePath || '/admin/sample-events'}
        onSave={async (updated) => {
          setTests((prev) => {
            // If the record already exists in the current page, update it; otherwise insert at the front
            const exists = prev.some((t) => t.id === updated.id);
            if (exists) return prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t));
            // Insert new at front so user sees their new test immediately
            return [updated, ...prev];
          });
          setSelected(updated);
          await alertSuccess('Saved', 'Sampling event updated successfully.');
        }}
      />
    </div>
  );
}
