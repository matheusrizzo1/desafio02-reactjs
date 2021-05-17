import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];

      const cartProduct = updatedCart.find((x) => x.id === productId);

      if (cartProduct) {
        const productAmount = cartProduct.amount + 1;
        updateProductAmount({ productId, amount: productAmount });
      } else {
        const product = await api
          .get(`/products/${productId}`)
          .then((response) => response.data);

        const newCart = [...updatedCart, { ...product, amount: 1 }];
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        setCart(newCart);
      }
    } catch (e) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.find((x) => x.id === productId)) throw "Produto inexistente";

      const newCart = cart.filter((x) => x.id !== productId);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

      setCart(newCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api
        .get(`/stock/${productId}`)
        .then((response) => response.data as Stock);

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = [...cart];
      const updatedCartProduct = updatedCart.find((x) => x.id === productId);
      if (updatedCartProduct) updatedCartProduct.amount = amount;

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));

      setCart(updatedCart);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
