import LakeFlowForm from '../../../components/LakeFlowForm';
import FilterPanel from '../../../components/table/FilterPanel';
import Modal from '../../../components/Modal';
import AppMap from '../../../components/AppMap';
import MapViewport from '../../../components/MapViewport';
import { GeoJSON, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import TableToolbar from '../../../components/table/TableToolbar';
import TableLayout from '../../../layouts/TableLayout';
import { useManageFlowsTabLogic } from './useManageTabs.jsx';

export default function ManageFlowsTab() {
  const s = useManageFlowsTabLogic();

  return (
    <div className="dashboard-card">
      <TableToolbar
        tableId={s.TABLE_ID}
        search={{ value: s.query, onChange: s.setQuery, placeholder: 'Search tributaries by lake, name, or source...' }}
        filters={[]}
        columnPicker={{ columns: s.columns, visibleMap: s.visibleMap, onVisibleChange: s.setVisibleMap }}
        onResetWidths={s.triggerResetWidths}
        onRefresh={s.fetchRows}
        onAdd={s.openCreate}
        onToggleFilters={() => s.setFiltersOpen((v) => !v)}
        filtersBadgeCount={s.activeFilterCount}
      />

      <FilterPanel
        open={s.filtersOpen}
        onClearAll={() => s.setAdv({})}
        fields={[
          {
            type: 'group',
            className: 'grid-3',
            children: [
              {
                id: 'flow_type',
                label: 'Type',
                type: 'select',
                value: s.adv.flow_type ?? '',
                onChange: (value) => s.setAdv((st) => ({ ...st, flow_type: value })),
                options: [
                  { value: '', label: 'All Types' },
                  { value: 'inflow', label: 'Inlets' },
                  { value: 'outflow', label: 'Outlets' },
                ],
              },
              {
                id: 'lake_id',
                label: 'Lake',
                type: 'select',
                value: s.adv.lake_id ?? '',
                onChange: (value) => s.setAdv((st) => ({ ...st, lake_id: value })),
                options: [
                  { value: '', label: 'All Lakes' },
                  ...s.lakes.map((lk) => ({ value: String(lk.id), label: lk.name })),
                ],
              },
            ],
          },
        ]}
      />

      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        <div className="table-wrapper" style={{ position:'relative' }}>
          {!s.loading && s.errorMsg ? (
            <div className="no-data" style={{ padding: 24 }}>{s.errorMsg}</div>
          ) : (
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
              loadingLabel={s.loading ? 'Loading tributaries…' : null}
            />
          )}
        </div>
      </div>

      <LakeFlowForm
        open={s.formOpen}
        mode={s.formMode}
        initialValue={s.formInitial || {}}
        lakes={s.lakes}
        lakesLoading={s.lakesLoading}
        onCancel={()=>s.setFormOpen(false)}
        onSubmit={s.submit}
      />
      <Modal open={s.viewOpen} onClose={()=>s.setViewOpen(false)} title="View Flow Point" width={900} ariaLabel="View Flow">
        <div style={{ height: 480, borderRadius: 8, overflow: 'hidden' }}>
          <AppMap view="osm" whenCreated={(m)=>{ s.viewMapRef.current = m; }} disableDrag={true} zoomControl={false} scrollWheelZoom={false}>
            {s.viewFeature && (
              <GeoJSON data={s.viewFeature} style={{ color:'#2563eb', weight:2, fillOpacity:0.08 }} />
            )}
            {s.viewFlowPoint && (
              <CircleMarker center={[s.viewFlowPoint.lat, s.viewFlowPoint.lon]} radius={8} pathOptions={{ color:'#ef4444', fillColor:'#ef4444', fillOpacity:0.9 }}>
                {/* Popup handled by map's default behavior */}
              </CircleMarker>
            )}
            {/* If geometry exists, fit bounds after creation */}
            {s.viewFeature && <MapViewport bounds={L.geoJSON(s.viewFeature).getBounds()} maxZoom={14} />}
            {!s.viewFeature && s.viewFlowPoint && <MapViewport bounds={[[s.viewFlowPoint.lat-0.02, s.viewFlowPoint.lon-0.02],[s.viewFlowPoint.lat+0.02, s.viewFlowPoint.lon+0.02]]} maxZoom={14} />}
          </AppMap>
        </div>
      </Modal>
    </div>
  );
}
