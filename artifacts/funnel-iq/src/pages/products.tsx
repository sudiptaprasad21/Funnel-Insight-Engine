import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListProducts,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Tag, TrendingDown } from "lucide-react";
import { PRODUCT_IMAGES, FALLBACK_IMAGE } from "@/lib/product-images";

export default function ProductsPage() {
  const { data: products, isLoading } = useListProducts(undefined, {
    query: { queryKey: getListProductsQueryKey() },
  });

  const saleProducts = products?.filter((p) => p.onSale) ?? [];
  const nappySubProducts = products?.filter((p) => p.isNappySub) ?? [];
  const allCategories = [...new Set(products?.map((p) => p.category) ?? [])];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Products</h1>
          <p className="text-muted-foreground">
            Campaign catalogue — Happy Mom Mother's Day collection
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Products</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold">{products?.length ?? 0}</p>
                  )}
                </div>
                <div className="p-2 bg-secondary rounded-lg">
                  <Package className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">On Sale</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="text-3xl font-bold">{saleProducts.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {products?.length
                          ? `${Math.round((saleProducts.length / products.length) * 100)}% of catalogue`
                          : ""}
                      </p>
                    </>
                  )}
                </div>
                <div className="p-2 bg-secondary rounded-lg">
                  <Tag className="h-4 w-4 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Subscription Items</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold">{nappySubProducts.length}</p>
                  )}
                </div>
                <div className="p-2 bg-secondary rounded-lg">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {!isLoading && allCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center">Categories:</span>
            {allCategories.map((cat) => (
              <Badge key={cat} variant="secondary" className="text-xs">
                {cat}
              </Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-video rounded-t-xl" />
                  <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))
            : products?.map((product) => {
                const discount =
                  product.onSale && product.salePrice
                    ? Math.round(
                        ((Number(product.price) - Number(product.salePrice)) /
                          Number(product.price)) *
                          100
                      )
                    : null;

                return (
                  <Card
                    key={product.id}
                    className="overflow-hidden flex flex-col"
                    data-testid={`product-card-${product.id}`}
                  >
                    <div className="relative aspect-video bg-slate-50 overflow-hidden">
                      <img
                        src={PRODUCT_IMAGES[product.id] ?? FALLBACK_IMAGE}
                        alt={product.name}
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        {product.onSale && (
                          <Badge className="bg-red-500 text-white border-none text-xs">
                            {discount !== null ? `-${discount}%` : "Sale"}
                          </Badge>
                        )}
                        {product.isNappySub && (
                          <Badge className="bg-green-600 text-white border-none text-xs">
                            Subscribe & Save
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          {product.category}
                        </p>
                        <h3 className="font-bold text-base leading-tight">{product.name}</h3>
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-auto pt-2 border-t border-border/50">
                        {product.onSale && product.salePrice ? (
                          <>
                            <span className="text-xl font-bold text-red-600">
                              ₹{Number(product.salePrice).toFixed(2)}
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              ₹{Number(product.price).toFixed(2)}
                            </span>
                            <Badge
                              variant="outline"
                              className="ml-auto text-xs bg-red-50 text-red-700 border-red-200"
                            >
                              Save ₹{(Number(product.price) - Number(product.salePrice)).toFixed(2)}
                            </Badge>
                          </>
                        ) : (
                          <span className="text-xl font-bold">
                            ₹{Number(product.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </div>
    </DashboardLayout>
  );
}
