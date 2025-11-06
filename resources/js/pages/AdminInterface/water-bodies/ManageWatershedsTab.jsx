import React from "react";
import AppMap from "../../../components/AppMap";
import MapViewport from "../../../components/MapViewport";
import Modal from "../../../components/Modal";
import { GeoJSON } from "react-leaflet";

import TableLayout from "../../../layouts/TableLayout";
import TableToolbar from "../../../components/table/TableToolbar";
import WatershedForm from "../../../components/WatershedForm";
import { useManageWatershedsTabLogic } from "./useManageTabs.jsx";

export default function ManageWatershedsTab() {
  const s = useManageWatershedsTabLogic();

  return (
    <div className="dashboard-card">
      <TableToolbar
        tableId={s.TABLE_ID}
        search={{
          value: s.query,
          onChange: s.setQuery,
          placeholder: "Search watersheds by name or description...",
        }}
        filters={[]}
        columnPicker={{ columns: s.columns, visibleMap: s.visibleMap, onVisibleChange: s.setVisibleMap }}
  onResetWidths={() => { s.triggerResetWidths(); try { localStorage.removeItem(s.TABLE_ID + '::sort'); } catch {}; s.setSort && s.setSort({ id: 'name', dir: 'asc' }); }}
        onRefresh={s.handleRefresh}
        onAdd={s.openCreate}
        onToggleFilters={undefined}
        filtersBadgeCount={0}
      />

      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        {!s.loading && s.errorMsg && <div className="no-data">{s.errorMsg}</div>}
        <div className="table-wrapper">
          <TableLayout
            tableId={s.TABLE_ID}
            columns={s.visibleColumns}
            data={s.rows}
            serverSide={true}
            pagination={{ page: s.pagination.page, totalPages: s.pagination.lastPage || 1 }}
            onPageChange={s.handlePageChange}
            sort={s.sort}
            onSortChange={s.handleSortChange}
            actions={s.actions}
            resetSignal={s.resetSignal}
            loading={s.loading}
            loadingLabel={s.loading ? 'Loading watersheds…' : null}
          />
        </div>
      </div>

      {/* Modal preview for watershed */}
      <Modal open={s.viewOpen} onClose={() => s.setViewOpen(false)} title={s.previewRow?.name ? `Watershed: ${s.previewRow.name}` : 'Watershed Preview'} width={900} ariaLabel="Watershed Preview">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '80vh' }}>
          <div style={{ height: '55vh', minHeight: 260, borderRadius: 8, overflow: 'hidden' }}>
            {s.previewFeature ? (
              <AppMap view="osm" whenCreated={(map) => (s.viewMapRef.current = map)} disableDrag={true} zoomControl={false} scrollWheelZoom={false}>
                <GeoJSON
                  data={s.previewFeature}
                  style={{ color: '#16a34a', weight: 2, fillOpacity: 0.15 }}
                  onEachFeature={(feat, layer) => {
                    const nm = feat?.properties?.name || 'Watershed';
                    layer.bindTooltip(nm, { sticky: true });
                  }}
                />

                {s.mapViewport.bounds ? (
                  <MapViewport
                    bounds={s.mapViewport.bounds}
                    maxZoom={s.mapViewport.maxZoom}
                    padding={s.mapViewport.padding}
                    pad={s.mapViewport.pad}
                    version={s.mapViewport.token}
                  />
                ) : null}
              </AppMap>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', color: '#6b7280' }}>
                <div style={{ padding: 20, textAlign: 'center' }}>No watershed preview available.</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 0 }}>
            {s.previewLoading && <div className="no-data">Loading preview...</div>}
            {!s.previewLoading && s.previewError && <div className="no-data">{s.previewError}</div>}
            {!s.previewLoading && !s.previewError && !s.previewFeature && <div className="no-data">No watershed preview available.</div>}
            {s.previewFeature && !s.previewLoading && !s.previewError && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Showing {s.previewRow?.name || 'Watershed'}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <WatershedForm
        open={s.formOpen}
        mode={s.formMode}
        initialValue={s.formInitial}
        loading={s.loading}
        onSubmit={s.handleSubmit}
        onCancel={() => s.setFormOpen(false)}
      />

    </div>
  );
}
