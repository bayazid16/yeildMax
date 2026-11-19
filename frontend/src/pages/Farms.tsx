import { useCallback, useEffect, useState } from "react";
import { farmsApi, type Farm, type Farmer } from "../api";
import {
  Card,
  SectionHeader,
  Input,
  Select,
  Button,
  StatCard,
} from "../components/ui";
import { Plus, MapPin, Building2 } from "lucide-react";

const CROP_OPTIONS = [
  { value: "boro_rice", label: "Boro Rice" },
  { value: "aman_rice", label: "Aman Rice" },
  { value: "wheat", label: "Wheat" },
  { value: "maize", label: "Maize" },
  { value: "potato", label: "Potato" },
];

const LAND_TYPE_OPTIONS = [
  { value: "irrigated", label: "Irrigated" },
  { value: "rainfed", label: "Rainfed" },
  { value: "mixed", label: "Mixed / Supplemental" },
];

export default function Farms() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [farmerId, setFarmerId] = useState("new");
  const [newFarmerName, setNewFarmerName] = useState("");
  const [areaHa, setAreaHa] = useState("");
  const [district, setDistrict] = useState("");
  const [upazila, setUpazila] = useState("");
  const [landType, setLandType] = useState("irrigated");
  const [cropCode, setCropCode] = useState("boro_rice");
  const [plantingDate, setPlantingDate] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [farmsRes, farmersRes] = await Promise.all([
        farmsApi.listFarms(),
        farmsApi.listFarmers(),
      ]);
      setFarms(farmsRes.data);
      setFarmers(farmersRes.data);
    } catch {
      setError("Failed to load farm registry data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      let resolvedFarmerId: number;

      if (farmerId === "new") {
        if (!newFarmerName.trim()) {
          setError("Enter a farmer name or select an existing farmer.");
          setFormLoading(false);
          return;
        }
        const farmerRes = await farmsApi.createFarmer({
          name: newFarmerName.trim(),
        });
        resolvedFarmerId = farmerRes.data.id;
      } else {
        resolvedFarmerId = parseInt(farmerId, 10);
      }

      await farmsApi.createFarm({
        farmer: resolvedFarmerId,
        area_ha: parseFloat(areaHa),
        district,
        upazila,
        land_type: landType,
        crop_code: cropCode,
        planting_date: plantingDate,
      });

      setShowForm(false);
      setFarmerId("new");
      setNewFarmerName("");
      setAreaHa("");
      setDistrict("");
      setUpazila("");
      setLandType("irrigated");
      setCropCode("boro_rice");
      setPlantingDate("");
      await loadData();
    } catch (err: any) {
      const data = err.response?.data;
      const fieldErrors = data?.field_errors
        ? Object.values(data.field_errors).flat().join(" ")
        : "";
      setError(
        fieldErrors ||
          data?.error ||
          data?.detail ||
          "Failed to create farm. Check the form values."
      );
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = farms.filter(
    (f) =>
      f.district.toLowerCase().includes(search.toLowerCase()) ||
      f.crop_code.toLowerCase().includes(search.toLowerCase()) ||
      f.farmer_name.toLowerCase().includes(search.toLowerCase())
  );

  const farmerOptions = [
    ...farmers.map((f) => ({ value: String(f.id), label: f.name })),
    { value: "new", label: "＋ Register new farmer" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Farm Registry"
          subtitle="Manage farmers and farm records stored in the backend."
          icon={Building2}
        />
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={16} className="mr-1" />
          Add Farm
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <StatCard value={farms.length} label="Total Farms" />
        <StatCard
          value={new Set(farms.map((f) => f.district)).size}
          label="Districts"
        />
        <StatCard
          value={new Set(farms.map((f) => f.farmer_name)).size}
          label="Farmers"
        />
      </div>

      {error && (
        <Card className="border-warning bg-warning/5">
          <p className="text-sm text-warning">{error}</p>
        </Card>
      )}

      <Card>
        <div className="mb-4">
          <Input
            id="search"
            label="Search farms"
            placeholder="Filter by farmer, district, or crop"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-xs text-text-secondary">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-text-secondary">
            No farms found. Add one above or generate a prediction.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase">
                    Farmer
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase">
                    Crop
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase">
                    Area
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase">
                    Location
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase">
                    Land Type
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase">
                    Planted
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((farm) => (
                  <tr
                    key={farm.id}
                    className="border-b border-border/50 hover:bg-surface-card/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-text-primary font-medium">
                      {farm.farmer_name}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary">
                      {farm.crop_code.replace("_", " ").toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-text-primary">
                      {farm.area_ha} ha
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} className="text-text-secondary" />
                        {farm.district}, {farm.upazila}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary capitalize">
                      {farm.land_type}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-text-secondary">
                      {farm.planting_date || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showForm && (
        <Card className="mt-4">
          <SectionHeader title="Register New Farm" icon={Plus} />
          <form
            onSubmit={handleCreateFarm}
            className="grid md:grid-cols-2 gap-4"
          >
            <Select
              id="farmer_id"
              label="Farmer"
              value={farmerId}
              onChange={(e) => setFarmerId(e.target.value)}
              options={farmerOptions}
              required
            />

            {farmerId === "new" ? (
              <Input
                id="new_farmer_name"
                label="New Farmer Name"
                placeholder="e.g. Anisur Rahman"
                value={newFarmerName}
                onChange={(e) => setNewFarmerName(e.target.value)}
                required
              />
            ) : (
              <div className="hidden md:block" />
            )}

            <Input
              id="area_ha"
              label="Area (ha)"
              type="number"
              step="0.01"
              value={areaHa}
              onChange={(e) => setAreaHa(e.target.value)}
              required
            />
            <Input
              id="district"
              label="District"
              placeholder="e.g. Mymensingh"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              required
            />
            <Input
              id="upazila"
              label="Upazila"
              placeholder="e.g. Trishal"
              value={upazila}
              onChange={(e) => setUpazila(e.target.value)}
              required
            />
            <Select
              id="land_type"
              label="Land Type"
              value={landType}
              onChange={(e) => setLandType(e.target.value)}
              options={LAND_TYPE_OPTIONS}
              required
            />
            <Select
              id="crop_code"
              label="Crop"
              value={cropCode}
              onChange={(e) => setCropCode(e.target.value)}
              options={CROP_OPTIONS}
              required
            />
            <Input
              id="planting_date"
              label="Planting Date"
              type="date"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
              required
            />

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" variant="primary" disabled={formLoading}>
                {formLoading ? "Saving…" : "Create Farm"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
