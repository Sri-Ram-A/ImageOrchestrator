import cv2
import numpy as np
from collections import Counter
from scipy.fftpack import dct, idct


def dct2(img):
    return dct(dct(img.T, norm="ortho").T, norm="ortho")


def idct2(coeffs):
    return idct(idct(coeffs.T, norm="ortho").T, norm="ortho")


class MinHeap:
    def __init__(self):
        self.heap = []

    @property
    def length(self):
        return len(self.heap)

    def push(self, child):
        self.heap.append(child)
        idx = self.length - 1
        parent = (idx - 1) // 2
        while idx > 0 and self.heap[parent] > self.heap[idx]:
            self.heap[parent], self.heap[idx] = self.heap[idx], self.heap[parent]
            idx = parent
            parent = (idx - 1) // 2

    def pop(self):
        if not self.heap:
            return None
        self.heap[0], self.heap[-1] = self.heap[-1], self.heap[0]
        temp = self.heap.pop()
        idx = 0
        while True:
            left, right = 2 * idx + 1, 2 * idx + 2
            smallest = idx
            if left < self.length and self.heap[left] < self.heap[smallest]:
                smallest = left
            if right < self.length and self.heap[right] < self.heap[smallest]:
                smallest = right
            if smallest == idx:
                break
            self.heap[idx], self.heap[smallest] = self.heap[smallest], self.heap[idx]
            idx = smallest
        return temp


class Node:
    def __init__(self, char, freq):
        self.char = char
        self.freq = freq
        self.left = None
        self.right = None

    def __repr__(self):
        return f"{self.char}:{self.freq}"

    def __lt__(self, other):
        return self.freq < other.freq


class Huffman:
    def __init__(self):
        self.tree = None

    def rle_encode(self, image_array):
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        flat = image_array.flatten()
        encoded = []
        prev = flat[0]
        count = 1
        for pixel in flat[1:]:
            if pixel == prev:
                count += 1
            else:
                encoded.append((int(prev), count))
                prev = pixel
                count = 1
        encoded.append((int(prev), count))
        return encoded

    def huffman_encode(self, table: dict):
        minHeap = MinHeap()
        for char, freq in table.items():
            minHeap.push(Node(char, freq))
        while minHeap.length > 1:
            left = minHeap.pop()
            r = minHeap.pop()
            node = Node(str(left.freq + r.freq), left.freq + r.freq)
            node.left, node.right = left, r
            minHeap.push(node)
        self.tree = minHeap.pop()
        codes = {}
        self.get_codes(self.tree, "", codes)
        return codes

    def get_codes(self, node, current_code="", codes={}):
        if not node:
            return
        if isinstance(node.char, tuple):
            codes[node.char] = current_code
        self.get_codes(node.left, current_code + "0", codes)
        self.get_codes(node.right, current_code + "1", codes)

    def huffman_decode(self, bitstream, code_to_symbol):
        decoded = []
        current = ""
        for bit in bitstream:
            current += bit
            if current in code_to_symbol:
                decoded.append(code_to_symbol[current])
                current = ""
        return decoded

    def rle_decode(self, rle_encoded, shape=(256, 256)):
        flat = []
        for value, count in rle_encoded:
            flat.extend([value] * count)
        return np.array(flat, dtype=np.uint8).reshape(shape)


def compress_image(channel):
    huffman = Huffman()
    if len(channel.shape) == 3:
        channel = cv2.cvtColor(channel, cv2.COLOR_BGR2GRAY)
    # RLE
    rle_encoded = huffman.rle_encode(channel)
    freq_table = Counter(rle_encoded)
    codes = huffman.huffman_encode(freq_table)
    # Huffman Encoding
    bitstream = "".join([codes[symbol] for symbol in rle_encoded])
    code_to_symbol = {v: k for k, v in codes.items()}
    return bitstream, code_to_symbol


def decompress_image(bitstream, code_to_symbol, shape):
    huffman = Huffman()
    # Huffman Decoding
    decoded_rle = huffman.huffman_decode(bitstream, code_to_symbol)
    # RLE Decoding
    reconstructed = huffman.rle_decode(decoded_rle, shape)
    return reconstructed
