export const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export const POPULAR_DISTRICTS: Record<string, string[]> = {
    "Maharashtra": ["Nashik", "Pune", "Mumbai", "Nagpur", "Amravati", "Aurangabad"],
    "Gujarat": ["Rajkot", "Ahmedabad", "Surat", "Vadodara"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior", "Ujjain"],
    "Haryana": ["Karnal", "Hisar", "Ambala"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar"],
    // Default fallback for others
    "default": ["District 1", "District 2"]
};
