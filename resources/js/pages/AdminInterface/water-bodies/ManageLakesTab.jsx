import React from "react";
import { GeoJSON } from "react-leaflet";
import AppMap from "../../../components/AppMap";
import MapViewport from "../../../components/MapViewport";
import Modal from "../../../components/Modal";
import "leaflet/dist/leaflet.css";
import TableLayout from "../../../layouts/TableLayout";
import LakeForm from "../../../components/LakeForm";
import TableToolbar from "../../../components/table/TableToolbar";
import FilterPanel from "../../../components/table/FilterPanel";
import { useManageLakesTabLogic } from "./useManageTabs.jsx";
import L from "leaflet";

function ManageLakesTab() {
  const s = useManageLakesTabLogic();

  return (
    <div className="dashboard-card">
      <TableToolbar
        tableId={s.TABLE_ID}
        search={{
          value: s.query,
          onChange: s.setQuery,
          placeholder: "Search lakes by name, alt name, location, watershed, classification...",
        }}
        filters={[]}
        columnPicker={{ columns: s.baseColumns, visibleMap: s.visibleMap, onVisibleChange: s.setVisibleMap }}
  onResetWidths={() => { s.triggerResetWidths(); s.restoreDefaults(); try { localStorage.removeItem(s.TABLE_ID + '::sort'); } catch {}; s.setSort && s.setSort({ id: 'name', dir: 'asc' }); }}
        onRefresh={s.fetchLakes}
        onAdd={s.openCreate}
        onToggleFilters={() => s.setFiltersOpen((value) => !value)}
        onRestoreDefaults={s.restoreDefaults}
        filtersBadgeCount={s.activeFilterCount}
      />

      <FilterPanel
        open={s.filtersOpen}
        onClearAll={() => s.setAdv({})}
        fields={[
          {
            type: 'group',
            className: 'grid-4',
            children: [
              {
                id: "flows_status",
                label: "Tributaries Status",
                type: "select",
                value: s.adv.flows_status ?? "",
                onChange: (value) => s.setAdv((state) => ({ ...state, flows_status: value })),
                options: [
                  { value: "", label: "All" },
                  { value: "present", label: "Exists" },
                  { value: "none", label: "None" },
                  { value: "unknown", label: "Not yet recorded" },
                ],
              },
              {
                id: "region",
                label: "Region",
                type: "select",
                value: s.adv.region ?? "",
                onChange: (value) => s.setAdv((state) => ({ ...state, region: value })),
                options: s.regionsForFilter,
              },
              {
                id: "province",
                label: "Province",
                type: "select",
                value: s.adv.province ?? "",
                onChange: (value) => s.setAdv((state) => ({ ...state, province: value })),
                options: s.provincesForFilter,
              },
              {
                id: "class_code",
                label: "Water Body Classification",
                type: "select",
                value: s.adv.class_code ?? "",
                onChange: (value) => s.setAdv((state) => ({ ...state, class_code: value })),
                options: s.classFilterOptions,
              },
            ]
          }
        ]}
      />

      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        {!s.loading && s.errorMsg && <div className="no-data">{s.errorMsg}</div>}
        <div className="table-wrapper">
          <TableLayout
            tableId={s.TABLE_ID}
            columns={s.visibleColumns}
            data={s.lakes}
            actions={s.actions}
            resetSignal={s.resetSignal}
            loading={s.loading}
            loadingLabel={s.loading ? 'Loading lakes…' : null}
            serverSide={true}
            pagination={{ page: s.pagination.page, totalPages: s.pagination.lastPage }}
            onPageChange={s.handlePageChange}
            sort={s.sort}
            onSortChange={s.handleSortChange}
          />
        </div>
      </div>

      {/* Modal preview for lake */}
      <Modal open={s.viewOpen} onClose={() => s.setViewOpen(false)} title={s.lakeFeature?.properties?.name ? `Lake: ${s.lakeFeature.properties.name}` : 'Lake Preview'} width={1000} ariaLabel="Lake Preview">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '80vh' }}>
          {/* Map area: only render when lake geometry exists; otherwise show placeholder */}
          {s.lakeFeature ? (
            <div style={{ height: '60vh', minHeight: 320, borderRadius: 8, overflow: 'hidden' }}>
              <AppMap view="osm" whenCreated={(map) => { s.viewMapRef.current = map; }} disableDrag={true} zoomControl={false} scrollWheelZoom={false}>
                {s.watershedFeature && (
                  <GeoJSON data={s.watershedFeature} style={{ weight: 1.5, color: '#047857', fillOpacity: 0.08 }} />
                )}

                {s.lakeFeature && (
                  <GeoJSON data={s.lakeFeature} style={{ weight: 2, color: '#2563eb', fillOpacity: 0.1 }} pointToLayer={(feature, latlng) => L.circleMarker(latlng, { color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.5, radius: 8 })} />
                )}

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
            </div>
          ) : (
            <div style={{ height: '60vh', minHeight: 320, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', color: '#6b7280' }}>
              <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No lake geometry</div>
                <div style={{ fontSize: 13 }}>This lake has no published geometry to preview.</div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 0 }}>
            {s.lakeFeature && !s.loading && !s.errorMsg && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Showing {s.lakeFeature.properties?.name || 'Lake'}{s.watershedFeature ? ` — Watershed: ${s.watershedFeature.properties?.name || ''}` : ''}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <LakeForm
        open={s.formOpen}
        mode={s.formMode}
        initialValue={s.formInitial}
        watersheds={s.watersheds}
        classOptions={s.classOptions}
        loading={s.loading}
        onSubmit={s.saveLake}
        onCancel={() => s.setFormOpen(false)}
      />
      {/* Delete confirmation handled via SweetAlert confirm dialog */}
    </div>
  );
}

export default ManageLakesTab;
