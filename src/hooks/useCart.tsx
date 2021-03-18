import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  async function getProductsOnStock(productId: number) {
    return api
      .get(`/stock/${productId}`)
      .then(response => response.data)
  }

  async function hasProductIdOnStock(productId: number, amount: number) {
    const productsOnStock: Stock = await getProductsOnStock(productId)

    const amountProductOnStock = productsOnStock.amount

    const hasProductOnStock = amount <= amountProductOnStock

    return hasProductOnStock
  }

  const addProduct = async (productId: number) => {
    try {
      let cartUpdated = cart

      const productOnCart = cart.filter(product => product.id === productId)[0]

      const hasProductOnStock = await hasProductIdOnStock(productId, productOnCart?.amount + 1 || 1)

      if (!hasProductOnStock) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const isProductOnCart = productOnCart !== undefined

      if (isProductOnCart) {
        cartUpdated = cart.map(product => 
          product.id === productId ? {
            ...product,
            amount: product.amount + 1
          }
          : product
        )
      } else {
        const newProduct: Product = await api
          .get(`/products/${productId}`)
          .then(response => ({
            ...response.data,
            amount: 1
          }))

        cartUpdated = [
          ...cart,
          newProduct
        ]
      }
      
      setCart(cartUpdated)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartUpdated = cart.filter(product => product.id !== productId)

      if (!cart.some(product => product.id === productId)) throw new Error()

      setCart(cartUpdated)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const hasProductOnStock = await hasProductIdOnStock(productId, amount)
      
      if (!hasProductOnStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const cartUpdated = cart.map(product => {
        return product.id === productId ? {
          ...product,
          amount
        } : product
      })

      setCart(cartUpdated)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
