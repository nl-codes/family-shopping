export const categories = [
    "Produce",
    "Dairy & Chilled",
    "Pantry",
    "Household",
    "Electronics",
    "Other",
] as const;
export type Category = string;
export type User = { _id: string; name: string };
export type List = {
    _id: string;
    title: string;
    createdBy: User;
    isArchived: boolean;
    isOwner: boolean;
    unlocked: boolean;
};
export type Item = {
    _id: string;
    listId: string;
    name: string;
    quantity: string;
    category: Category;
    status: "YET_TO_BUY" | "BOUGHT";
    estimatedPrice?: number | null;
    purchaseLocation?: string;
    addedBy: User;
    boughtBy: User | null;
    buyLocation: string | null;
    isRecurring: boolean;
    createdAt: string;
};
