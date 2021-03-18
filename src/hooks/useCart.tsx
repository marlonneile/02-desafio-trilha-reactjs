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

  const addProduct = async (productId: number) => {
    try {
      let cartUpdated = cart

      const isProductOnCart = cart.some(product => product.id === productId)

      const productsOnStock: Stock[] = await api
        .get('/stock')
        .then(response => response.data)
      
      const amountProductOnStock = productsOnStock
        .filter(stock => stock.id === productId)[0].amount

      const hasProductOnStock = cart.some(product =>
        (product.id === productId
          && product.amount < amountProductOnStock)
      ) || !isProductOnCart
      
      if (!hasProductOnStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (isProductOnCart) {
        cartUpdated = cart.map(product => 
          product.id === productId ? {
            ...product,
            amount: product.amount + 1
          }
          : product
        )
      } else {
        const allProducts: Product[] = await api
          .get('/products')
          .then(response => response.data)

        const newProduct = {
          ...allProducts.filter(product => product.id === productId)[0],
          amount: 1
        }
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
      const cartUpdated = cart.map(product => {
        return (
          product.id === productId ? {
            ...product,
            amount: product.amount - 1
          }
          : product
        )
      })

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
      // TODO
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
