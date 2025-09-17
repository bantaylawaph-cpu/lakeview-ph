// resources/js/pages/OrgInterface/OrgLogTest.jsx 
import React, { useEffect, useMemo, useState } from "react";
import {
  FiMap, FiClock, FiList, FiPaperclip, FiCheckCircle,
  FiPlus, FiTrash2
} from "react-icons/fi";
import Wizard from "../../components/Wizard";
import TableLayout from "../../layouts/TableLayout";

export default function OrgLogTest() {
  const [lakeOptions, setLakeOptions] = useState([]);      // TODO: GET /api/lakes?org=me
  const [stationOptions, setStationOptions] = useState([]); // TODO: GET /api/stations?lake_id=
  const [paramOptions, setParamOptions] = useState([]);     // TODO: GET /api/parameters

  useEffect(() => {
    // TODO: fetch lakes & parameters on mount
    setLakeOptions([]);
    setParamOptions([]);
  }, []);

  const steps = [
    {
      key: "lake_station",
      title: "Lake & Station",
      render: ({ data, setData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title"><FiMap /><span>Lake & Station</span></div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              <div className="form-group">
                <label>Lake *</label>
                <select
                  value={data.lakeId || ""}
                  onChange={(e) => {
                    const lakeId = e.target.value;
                    setData({ ...data, lakeId, stationId: "" });
                    // TODO: load stations for lakeId
                    setStationOptions([]);
                  }}
                >
                  <option value="">Select a lake…</option>
                  {lakeOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Station *</label>
                <select
                  value={data.stationId || ""}
                  onChange={(e) => setData({ ...data, stationId: e.target.value })}
                  disabled={!data.lakeId}
                >
                  <option value="">Select a station…</option>
                  {stationOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>&nbsp;</label>
                <button type="button" className="pill-btn" disabled={!data.lakeId}
                  onClick={() => {/* TODO: open create-station modal */}}>
                  <FiPlus /> <span className="hide-sm">New Station</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      // no canNext → always allowed to proceed
    },

    {
      key: "metadata",
      title: "Sampling Metadata",
      render: ({ data, setData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title"><FiClock /><span>Sampling Metadata</span></div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              <div className="form-group">
                <label>Date & Time *</label>
                <input type="datetime-local"
                  value={data.sampledAt || ""}
                  onChange={(e) => setData({ ...data, sampledAt: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Sampler</label>
                <input type="text" placeholder="Name / Team"
                  value={data.sampler || ""} onChange={(e)=>setData({...data, sampler: e.target.value})}/>
              </div>
              <div className="form-group">
                <label>Method</label>
                <input type="text" placeholder="Field/Lab method"
                  value={data.method || ""} onChange={(e)=>setData({...data, method: e.target.value})}/>
              </div>
              <div className="form-group">
                <label>Depth (m)</label>
                <input type="number" step="0.01"
                  value={data.depth_m ?? ""} onChange={(e)=>setData({...data, depth_m: e.target.value})}/>
              </div>
              <div className="form-group" style={{ flexBasis: "100%" }}>
                <label>Notes</label>
                <input type="text" placeholder="Weather, conditions, remarks"
                  value={data.notes || ""} onChange={(e)=>setData({...data, notes: e.target.value})}/>
              </div>
            </div>
          </div>
        </div>
      ),
      // no canNext
    },

    {
      key: "measurements",
      title: "Measurements",
      render: ({ data, setData }) => <MeasurementsStep data={data} setData={setData} params={paramOptions} />,
      // no canNext
    },

    {
      key: "attachments",
      title: "Attachments",
      render: ({ data, setData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title"><FiPaperclip /><span>Attachments</span></div>
          </div>
          <div className="dashboard-card-body">
            <div className="dropzone"
              onDragOver={(e)=>e.preventDefault()}
              onDrop={(e)=>{ e.preventDefault(); const files=[...e.dataTransfer.files]; setData({...data, attachments:[...(data.attachments||[]), ...files]}); }}>
              <p>Drop files here or click to select</p>
              <small>Upload lab reports, photos, etc.</small>
              <input type="file" multiple onChange={(e)=>setData({...data, attachments:[...(data.attachments||[]), ...e.target.files]})}/>
            </div>

            <ul style={{ marginTop: 10 }}>
              {(data.attachments||[]).length===0 ? <div className="no-data">No attachments</div> :
                [...data.attachments].map((f,i)=>(
                  <li key={i} className="file-row">
                    <FiPaperclip/><span className="file-name">{f.name || `Attachment ${i+1}`}</span>
                    <button className="action-btn delete" onClick={()=>{
                      const copy=[...data.attachments]; copy.splice(i,1); setData({...data, attachments:copy});
                    }}><FiTrash2/><span className="btn-text">Remove</span></button>
                  </li>
                ))
              }
            </ul>
          </div>
        </div>
      ),
      // no canNext
    },

    {
      key: "review",
      title: "Review & Submit",
      render: ({ data }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title"><FiCheckCircle /><span>Review & Submit</span></div>
          </div>
          <div className="dashboard-card-body">
            <p>Everything looks good? Submitting will create a sample in <strong>draft</strong> or <strong>submitted</strong> status (your choice below).</p>
            {/* You can show a simple summary here; keep it light for MVP */}
            <div className="org-form" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label>Submit as</label>
                <select value={data.submitStatus || "submitted"} onChange={(e)=>{ /* set in onFinish to avoid partial state */ }}>
                  <option value="submitted">Submitted</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ),
      // no canNext
    },
  ];

  return (
    <Wizard
      steps={steps}
      initialData={{
        lakeId: "", stationId: "", sampledAt: "",
        sampler: "", method: "", depth_m: "", notes: "",
        measurements: [], attachments: [],
        submitStatus: "submitted",
      }}
      labels={{ back: "Back", next: "Next", finish: "Submit" }}
      onFinish={(data) => {
        // TODO: POST /api/samples with nested measurements & attachments
        // {
        //   lake_id, station_id, sampled_at, sampler, method, depth_m, notes, status,
        //   measurements: [{ parameter_id, value_num, unit, qualifier, detection_limit, remarks }],
        // }
        console.log("SUBMIT SAMPLE (scaffold):", data);
        alert("Sample submitted (scaffold). Wire to backend when ready.");
      }}
    />
  );
}

/* ---------------- Measurements step (inline editor table) ---------------- */
function MeasurementsStep({ data, setData, params }) {
  const rows = data.measurements || [];

  const addRow = () => {
    setData({ ...data, measurements: [...rows, { parameterId: "", value: "", unit: "", qualifier: "=", dl: "", remarks: "" }] });
  };
  const upd = (idx, patch) => {
    const copy = rows.map((r,i)=> i===idx ? ({ ...r, ...patch }) : r);
    setData({ ...data, measurements: copy });
  };
  const del = (idx) => {
    const copy = rows.slice(); copy.splice(idx,1);
    setData({ ...data, measurements: copy });
  };

  const columns = useMemo(()=>[
    { header: "Parameter", render: (row, idx) => (
        <select value={row.parameterId} onChange={(e)=>{
          const p = params.find(x => String(x.id)===e.target.value);
          upd(idx, { parameterId: e.target.value, unit: p?.unit || row.unit });
        }}>
          <option value="">Select…</option>
          {params.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
      )
    },
    { header: "Value", width: 140,
      render: (row, idx) => (
        <input type="number" step="0.0001" value={row.value}
          onChange={(e)=>upd(idx, { value: e.target.value })} />
      )
    },
    { header: "Unit", width: 120,
      render: (row, idx) => (
        <input type="text" value={row.unit || ""} onChange={(e)=>upd(idx, { unit: e.target.value })}/>
      )
    },
    { header: "Qual.", width: 90,
      render: (row, idx) => (
        <select value={row.qualifier||"="} onChange={(e)=>upd(idx,{ qualifier: e.target.value })}>
          <option>=</option><option>&lt;</option><option>&gt;</option>
        </select>
      )
    },
    { header: "DL", width: 110,
      render: (row, idx) => (
        <input type="number" step="0.0001" value={row.dl || ""} onChange={(e)=>upd(idx,{ dl: e.target.value })}/>
      )
    },
    { header: "Remarks",
      render: (row, idx) => (
        <input type="text" value={row.remarks || ""} onChange={(e)=>upd(idx,{ remarks: e.target.value })}/>
      )
    },
  ], [params]);

  const actions = useMemo(()=>[
    { label: "Remove", type: "delete", icon: <FiTrash2/>, onClick: (_, idx)=> del(idx) },
  ], []);

  const dataWithIndex = rows.map((r,i)=> ({ ...r, __idx: i }));

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-title"><FiList /><span>Measurements</span></div>
        <div className="page-header-actions" style={{ marginLeft: "auto" }}>
          <button type="button" className="pill-btn primary" onClick={addRow}><FiPlus/><span className="hide-sm">Add Row</span></button>
        </div>
      </div>

      <div className="dashboard-card-body">
        <div className="table-wrapper">
          <TableLayout
            columns={columns}
            data={dataWithIndex}
            pageSize={5}
            actions={actions.map(a => ({
              ...a,
              onClick: (row) => a.onClick(row, row.__idx),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
