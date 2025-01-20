import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as L from 'leaflet';

import "leaflet/dist/leaflet.css";
import { Feature, FeatureCollection, GeoJsonProperties } from "geojson";

export class MapControl {
  private mapContainer: HTMLDivElement | undefined;
  private leafletMap: L.Map | undefined;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    // Create map container
    this.mapContainer = document.createElement("div");
    this.mapContainer.style.width = "100%";
    this.mapContainer.style.height = "400px";
    container.appendChild(this.mapContainer);

    // Initialize Leaflet map
    this.leafletMap = L.map(this.mapContainer).setView([0, 0], 2);

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(this.leafletMap);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    // Get GeoJSON data from the property
    const geoJsonString = context.parameters.geoJsonData.raw || "";

    if (geoJsonString && this.leafletMap) {
      try {
        // Parse the GeoJSON string
        const geoJsonData: GeoJSON.FeatureCollection = JSON.parse(geoJsonString);

        // Clear previous layers
        this.leafletMap.eachLayer((layer: L.Layer) => {
          if (!(layer instanceof L.TileLayer)) {
            this.leafletMap?.removeLayer(layer);
          }
        });

        // Add new GeoJSON layers
        L.geoJSON(geoJsonData, {
          style: (feature?: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>) => ({
            color: feature?.properties?.color || "blue",
            weight: 2,
          }),
          onEachFeature: (
            feature: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>,
            layer: L.Layer
          ) => {
            if (feature.properties) {
              const { zone, population, color, id } = feature.properties;
              const popupContent = `
                <strong>Zone:</strong> ${zone || "N/A"}<br>
                <strong>Population:</strong> ${population || "N/A"}<br>
                <strong>Color:</strong> ${color || "N/A"}<br>
                <strong>ID:</strong> ${id || "N/A"}
              `;
              (layer as L.Layer).bindPopup(popupContent);
            }
          },
        }).addTo(this.leafletMap);
      } catch (error) {
        console.error("Invalid GeoJSON data:", error);
      }
    }
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    // Cleanup logic
    if (this.leafletMap) {
      this.leafletMap.remove();
    }
  }
}
