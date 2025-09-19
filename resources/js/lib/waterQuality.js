import { api, buildQuery, apiPublic } from "./api";

function mapStation(record) {
  if (!record) return null;
  const lat = record.latitude ?? record.lat ?? null;
  const lng = record.longitude ?? record.lng ?? null;
  return {
    id: record.id,
    lake_id: record.lake_id ?? null,
    name: record.name ?? "",
    description: record.description ?? "",
    lat: lat === null || lat === undefined ? null : Number(lat),
    lng: lng === null || lng === undefined ? null : Number(lng),
    is_active: record.is_active ?? true,
  };
}

function normalizeStatus(status) {
  if (!status) return "draft";
  if (status === "public") return "published";
  return status;
}

function denormalizeStatus(status) {
  if (status === "published") return "public";
  return status ?? "draft";
}

function mapResult(result) {
  if (!result) return null;
  const parameter = result.parameter || {};
  return {
    parameter_id: result.parameter_id ?? parameter.id ?? "",
    code: result.code ?? parameter.code ?? "",
    name: result.name ?? parameter.name ?? "",
    unit: result.unit ?? parameter.unit ?? "",
    value: result.value ?? null,
    depth_m: result.depth_m ?? null,
    remarks: result.remarks ?? "",
  };
}

function mapSamplingEvent(record) {
  if (!record) return null;
  const lake = record.lake || {};
  const station = record.station || {};
  const standard = record.applied_standard || {};

  return {
    id: record.id,
    organization_id: record.organization_id ?? null,
    lake_id: record.lake_id ?? lake.id ?? null,
    lake_name: record.lake_name ?? lake.name ?? "",
    lake_class_code: record.lake_class_code ?? lake.class_code ?? "",
    station_id: record.station_id ?? station.id ?? null,
    station_name: record.station_name ?? station.name ?? "",
    applied_standard_id: record.applied_standard_id ?? standard.id ?? null,
    applied_standard_code: record.applied_standard_code ?? standard.code ?? "",
    applied_standard_name: standard.name ?? record.applied_standard_name ?? "",
    sampled_at: record.sampled_at,
    sampler_name: record.sampler_name ?? "",
    method: record.method ?? "",
    weather: record.weather ?? "",
    notes: record.notes ?? "",
    status: normalizeStatus(record.status),
    lat:
      record.latitude === null || record.latitude === undefined
        ? record.lat === null || record.lat === undefined
          ? null
          : Number(record.lat)
        : Number(record.latitude),
    lng:
      record.longitude === null || record.longitude === undefined
        ? record.lng === null || record.lng === undefined
          ? null
          : Number(record.lng)
        : Number(record.longitude),
    results_count: record.results_count ?? record.results?.length ?? 0,
    year: record.year ?? null,
    quarter: record.quarter ?? null,
    month: record.month ?? null,
    day: record.day ?? null,
    results: Array.isArray(record.results) ? record.results.map(mapResult) : [],
  };
}

function pickMembership(data) {
  const active = data?.active_membership;
  if (active) {
    return {
      organization_id: active.organization_id,
      organization_name: active.organization_name,
      role: active.role,
    };
  }
  const first = data?.memberships?.find((m) => m.organization_id != null);
  if (first) {
    return {
      organization_id: first.organization_id,
      organization_name: first.organization_name,
      role: first.role,
    };
  }
  return null;
}

export async function fetchOrgContext() {
  const res = await api("/org/whoami");
  const membership = pickMembership(res?.data ?? {});
  return {
    raw: res?.data ?? {},
    membership,
  };
}

export async function fetchOrgStations({ organizationId, lakeId, isActive } = {}) {
  const params = {
    organization_id: organizationId,
    lake_id: lakeId,
    is_active: typeof isActive === "boolean" ? isActive : undefined,
  };

  const res = await api(`/org/stations${buildQuery(params)}`);
  const rows = Array.isArray(res?.data) ? res.data : [];
  return rows.map(mapStation);
}

export async function createOrgStation(payload) {
  const body = {
    organization_id: payload.organization_id ?? null,
    lake_id: payload.lake_id,
    name: payload.name,
    description: payload.description ?? null,
    is_active: payload.is_active ?? true,
    latitude: payload.latitude ?? payload.lat ?? null,
    longitude: payload.longitude ?? payload.lng ?? null,
  };

  const res = await api("/org/stations", { method: "POST", body });
  return mapStation(res?.data);
}

export async function updateOrgStation(id, payload) {
  const body = {
    organization_id: payload.organization_id ?? null,
    lake_id: payload.lake_id,
    name: payload.name,
    description: payload.description ?? null,
    is_active: payload.is_active,
    latitude: payload.latitude ?? payload.lat ?? null,
    longitude: payload.longitude ?? payload.lng ?? null,
  };

  const res = await api(`/org/stations/${id}`, { method: "PATCH", body });
  return mapStation(res?.data);
}

export async function deleteOrgStation(id) {
  await api(`/org/stations/${id}`, { method: "DELETE" });
}

export async function fetchOrgWqTests({
  organizationId,
  lakeId,
  status,
  sampledFrom,
  sampledTo,
} = {}) {
  const params = {
    organization_id: organizationId,
    lake_id: lakeId,
    status: status ? denormalizeStatus(status) : undefined,
    sampled_from: sampledFrom,
    sampled_to: sampledTo,
  };

  const res = await api(`/org/sample-events${buildQuery(params)}`);
  const rows = Array.isArray(res?.data) ? res.data : [];
  return rows.map(mapSamplingEvent);
}

export async function fetchOrgWqTest(id, { organizationId } = {}) {
  const params = {
    organization_id: organizationId,
  };

  const res = await api(`/org/sample-events/${id}${buildQuery(params)}`);
  return mapSamplingEvent(res?.data);
}

export async function createOrgWqTest(payload) {
  const body = {
    organization_id: payload.organization_id ?? null,
    lake_id: payload.lake_id,
    station_id: payload.station_id ?? null,
    applied_standard_id: payload.applied_standard_id ?? null,
    sampled_at: payload.sampled_at,
    sampler_name: payload.sampler_name ?? null,
    method: payload.method ?? null,
    weather: payload.weather ?? null,
    notes: payload.notes ?? null,
    status: denormalizeStatus(payload.status),
    latitude: payload.latitude ?? payload.lat ?? null,
    longitude: payload.longitude ?? payload.lng ?? null,
    measurements: Array.isArray(payload.measurements)
      ? payload.measurements.map((m) => ({
          parameter_id: m.parameter_id,
          value: m.value,
          unit: m.unit ?? null,
          depth_m: m.depth_m ?? null,
          remarks: m.remarks ?? null,
        }))
      : [],
  };

  const res = await api("/org/sample-events", { method: "POST", body });
  return mapSamplingEvent(res?.data);
}

export async function updateOrgWqTest(id, payload) {
  const body = {
    organization_id: payload.organization_id ?? null,
    lake_id: payload.lake_id,
    station_id: payload.station_id ?? null,
    applied_standard_id: payload.applied_standard_id ?? null,
    sampled_at: payload.sampled_at,
    sampler_name: payload.sampler_name ?? null,
    method: payload.method ?? null,
    weather: payload.weather ?? null,
    notes: payload.notes ?? null,
    status: payload.status ? denormalizeStatus(payload.status) : undefined,
    latitude: payload.latitude ?? payload.lat ?? null,
    longitude: payload.longitude ?? payload.lng ?? null,
    measurements: Array.isArray(payload.measurements)
      ? payload.measurements.map((m) => ({
          parameter_id: m.parameter_id,
          value: m.value,
          unit: m.unit ?? null,
          depth_m: m.depth_m ?? null,
          remarks: m.remarks ?? null,
        }))
      : undefined,
  };

  const res = await api(`/org/sample-events/${id}`, { method: "PATCH", body });
  return mapSamplingEvent(res?.data);
}

export async function deleteOrgWqTest(id) {
  await api(`/org/sample-events/${id}`, { method: "DELETE" });
}

export async function setOrgWqTestStatus(id, status, { organizationId } = {}) {
  const body = { status: denormalizeStatus(status) };
  if (organizationId) {
    body.organization_id = organizationId;
  }

  const res = await api(`/org/sample-events/${id}`, {
    method: "PATCH",
    body,
  });
  return mapSamplingEvent(res?.data);
}

export async function fetchLakeOptions() {
  const res = await api("/options/lakes");
  return Array.isArray(res) ? res : [];
}

export async function fetchParameterOptions() {
  const res = await api("/options/parameters");
  return Array.isArray(res) ? res : [];
}

export async function fetchStandardOptions() {
  const res = await api("/options/wq-standards");
  return Array.isArray(res) ? res : [];
}

export async function fetchLakeGeometry(lakeId) {
  if (!lakeId) return null;
  const res = await apiPublic(`/lakes/${lakeId}`);
  if (!res?.geom_geojson) return null;
  try {
    return JSON.parse(res.geom_geojson);
  } catch (_) {
    return null;
  }
}

export {
  mapSamplingEvent,
  mapStation,
  normalizeStatus,
  denormalizeStatus,
};

