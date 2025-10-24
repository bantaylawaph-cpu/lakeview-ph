import React from "react";
import Modal from "../../components/Modal";

// Modal variant of About page content; shown on top of MapPage
function AboutPage({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="About LakeView PH"
      width={720}
      bodyClassName="content-page modern-scrollbar"
      ariaLabel="About LakeView PH"
    >
      <div className="content-page" style={{ paddingTop: 4 }}>
        <h1 style={{ marginTop: 0 }}>About LakeView PH</h1>
        <p style={{ marginTop: 8 }}>
          LakeView PH is a map‑first app for exploring lakes across the Philippines. It lets anyone browse public
          lake data, view helpful overlays, and understand context like watersheds, nearby stations, and more—all
          from an easy, interactive map.
        </p>

        <h2 style={{ fontSize: 18, margin: '22px 0 8px' }}>What you can do on the Map</h2>
        <ul style={{ lineHeight: 1.55, paddingLeft: 18, marginTop: 6 }}>
          <li>
            <strong>Explore the map</strong>: pan, zoom, and switch base maps (OSM or Satellite) using the layer toggle.
          </li>
          <li>
            <strong>Find places fast</strong>: use the search bar; pick a result to fly the map to it and open the lake panel when relevant.
          </li>
          <li>
            <strong>Filter lakes</strong>: open the Filter tray to focus on the lakes you care about.
          </li>
          <li>
            <strong>Learn about a lake</strong>: click a lake to open the Lake Info Panel. Toggle its watershed, switch
            data overlays, enable a population heatmap, and jump to water‑quality stations.
          </li>
          <li>
            <strong>See inflows/outflows</strong>: show lake flow markers (inflow/outflow). Click a marker to view details.
          </li>
          <li>
            <strong>Measure and capture</strong>: right‑click the map to measure distance or area, and use the screenshot
            button to save the current view.
          </li>
          <li>
            <strong>Read more</strong>: the “About the Data” and “Data Privacy Disclaimer” are available from the Sidebar as modals.
          </li>
          <li>
            <strong>Send feedback</strong>: open the feedback form from the Sidebar to share ideas or report issues.
          </li>
        </ul>

        <h2 style={{ fontSize: 18, margin: '22px 0 8px' }}>Contribute as a public user</h2>
        <p className="muted" style={{ lineHeight: 1.55 }}>
          If you create an account, you can start a short KYC process to contribute observations or join an organization.
          Look for “Contribute / Join an Org” in the Sidebar when you’re signed in.
        </p>

        <h2 style={{ fontSize: 18, margin: '22px 0 8px' }}>Quick tips</h2>
        <ul style={{ lineHeight: 1.55, paddingLeft: 18, marginTop: 6 }}>
          <li>Open the Sidebar from the top-left menu; pin it to keep it visible while you explore.</li>
        </ul>
      </div>
    </Modal>
  );
}

export default AboutPage;